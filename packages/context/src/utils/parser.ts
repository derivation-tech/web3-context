import { BigNumber, ethers } from 'ethers';
import { FormatTypes, FunctionFragment, LogDescription, TransactionDescription } from '@ethersproject/abi';
import { ErrorDescription } from '@ethersproject/abi/lib/interface';
import { TokenInfo } from '../types';
import { MAX_UINT256 } from './constant';
import { formatUnits } from './common';
import { ContractParserError } from '../error';

export class ContractParser {
    interface: ethers.utils.Interface;
    // clouse to parse address
    addressParser?: (address: string) => Promise<string>;

    // size of deployment tx calldata, in other words, size of creation code without constructor arguments
    public deploymentCodeSize: number | undefined;

    constructor(interface_: ethers.utils.Interface, addressParser?: (address: string) => Promise<string>) {
        this.interface = interface_;
        this.addressParser = addressParser;
    }

    // private function to parse base param
    private async _parseBaseParam(
        description: TransactionDescription | LogDescription | ErrorDescription,
        paramType: ethers.utils.ParamType,
        value: BigNumber | number | string,
    ): Promise<string> {
        // parse address type first
        if (paramType.baseType === 'address') {
            return await this.parseAddress(value as string);
        } else {
            return await this.parseBaseParam(description, paramType, value as BigNumber | number);
        }
    }

    public async parseAddress(value: string): Promise<string> {
        return this.addressParser ? '[' + (await this.addressParser(value)) + ']' + value : value;
    }

    // subclass to override this function to parse base param
    public async parseBaseParam(
        description: TransactionDescription | LogDescription | ErrorDescription,
        paramType: ethers.utils.ParamType,
        value: BigNumber | number,
    ): Promise<string> {
        return value.toString();
    }

    // subclass to override this function to parse base array param
    public async parseBaseArrayParam(
        description: TransactionDescription | LogDescription | ErrorDescription,
        paramType: ethers.utils.ParamType,
        value: any[],
    ) {
        let str = '';
        for (let i = 0; i < value.length; i++) {
            str += (await this._parseBaseParam(description, paramType.arrayChildren, value[i])) + ',';
        }
        str = str.slice(0, -1); // remove final comma
        return str;
    }

    protected async parseParam(
        description: TransactionDescription | LogDescription | ErrorDescription,
        paramType: ethers.utils.ParamType,
        value: any,
    ): Promise<string> {
        if (paramType.baseType === 'array') {
            let str = paramType.name + ':' + '[';
            if (paramType.components) {
                for (const item of value) {
                    str += '(';
                    for (const subParamType of paramType.components) {
                        str += (await this.parseParam(description, subParamType, item[subParamType.name])) + ', ';
                    }
                    str = str.slice(0, -2);
                    str += '),';
                }
                str = str.slice(0, -1); // remove final comma
            } else {
                str += await this.parseBaseArrayParam(description, paramType, value);
            }
            str += ']';
            return str;
        } else if (paramType.baseType === 'tuple') {
            let str = paramType.name + ':' + '(';
            for (const subParamType of paramType.components) {
                str += (await this.parseParam(description, subParamType, value[subParamType.name])) + ', ';
            }
            str = str.slice(0, -2); // remove final comma and space
            str += ')';
            return str;
        } else {
            return paramType.name + ':' + (await this._parseBaseParam(description, paramType, value));
        }
    }

    protected async parseFunction(description: ethers.utils.TransactionDescription): Promise<string> {
        const inputs: string[] = [];

        for (let i = 0; i < description.functionFragment.inputs.length; i++) {
            const paramType = description.functionFragment.inputs[i];

            inputs.push(`${await this.parseParam(description, paramType, description.args[i])}`);
        }

        const value = description.value.gt(0) ? `{value: ${ethers.utils.formatEther(description.value)}}` : '';
        return `${description.name}(${inputs.join(',')})` + value;
    }

    public async parseDeployment(tx: { data: string; value?: ethers.BigNumberish }): Promise<string> {
        if (!this.deploymentCodeSize) {
            throw new ContractParserError(
                'deploymentCodeSize is not set. I cannot determine where constructor arguments start',
            );
        }
        const fragment = this.interface.deploy;
        const encodedArgs = ethers.utils.hexDataSlice(tx.data, this.deploymentCodeSize);
        const description = new TransactionDescription({
            args: this.interface._abiCoder.decode(fragment.inputs, encodedArgs),
            functionFragment: fragment as FunctionFragment,
            name: 'constructor',
            signature: fragment.format(FormatTypes.full),
            sighash: tx.data.substring(0, 10),
            value: BigNumber.from(tx.value || '0'),
        });
        return await this.parseFunction(description);
    }

    public async parseEvent(description: ethers.utils.LogDescription): Promise<string> {
        const inputs: string[] = [];

        for (let i = 0; i < description.eventFragment.inputs.length; i++) {
            const paramType = description.eventFragment.inputs[i];
            inputs.push(`${await this.parseParam(description, paramType, description.args[i])}`);
        }

        return `${description.eventFragment.name}(${inputs.join(',')})`;
    }

    public async parseTransaction(tx: { data: string; value?: ethers.BigNumberish }): Promise<string[]> {
        const result: string[] = [];
        const description = this.interface.parseTransaction(tx);
        if (!description) throw new ContractParserError(`Invalid transaction data ${tx.data.toString()}`);

        if (description.name.toLowerCase() === 'multicall') {
            for (const subcalldata of description.args.data) {
                result.push(...(await this.parseTransaction({ data: subcalldata })));
            }
        } else {
            result.push(await this.parseFunction(description));
        }
        return result;
    }

    public async parseError(description: ErrorDescription): Promise<string> {
        const inputs: string[] = [];

        for (let i = 0; i < description.errorFragment.inputs.length; i++) {
            const paramType = description.errorFragment.inputs[i];
            inputs.push(`${await this.parseParam(description, paramType, description.args[i])}`);
        }

        return `${description.errorFragment.name}(${inputs.join(',')})`;
    }
}

export class Erc20Parser extends ContractParser {
    tokenInfo: TokenInfo;

    constructor(
        iface: ethers.utils.Interface,
        tokenInfo: TokenInfo,
        addressParser?: (address: string) => Promise<string>,
    ) {
        super(iface, addressParser);
        this.tokenInfo = tokenInfo;
    }

    override async parseBaseParam(
        description: TransactionDescription | LogDescription | ErrorDescription,
        paramType: ethers.utils.ParamType,
        value: BigNumber | number,
    ) {
        switch (paramType.type) {
            case 'uint256':
                // different erc20 handles maxed approval differently:
                // some reduce the approval gradually as you spend, while others simply check and maintain the maximum approval during spending
                // for better human readability, we will simply show MAX if the approval is greater than MAX_UINT256/2
                if (
                    (description.name.toLowerCase() === 'approve' || description.name.toLowerCase() === 'approval') &&
                    BigNumber.from(value).gte(MAX_UINT256.div(2))
                ) {
                    return 'MAX';
                }
                return `${formatUnits(value, this.tokenInfo.decimals)} ${this.tokenInfo.symbol}`;
            default:
                return value.toString();
        }
    }
}

export class UniswapV2PairParser extends ContractParser {
    tokenATokenInfo: TokenInfo;
    tokenBTokenInfo: TokenInfo;
    tokenAIsToken0: boolean;

    constructor(
        iface: ethers.utils.Interface,
        tokenATokenInfo: TokenInfo,
        tokenBTokenInfo: TokenInfo,
        addressParser?: (address: string) => Promise<string>,
    ) {
        super(iface, addressParser);
        this.tokenATokenInfo = tokenATokenInfo;
        this.tokenBTokenInfo = tokenBTokenInfo;

        this.tokenAIsToken0 = tokenATokenInfo.address.toLowerCase() < tokenBTokenInfo.address.toLowerCase();
    }

    async parseEvent(description: ethers.utils.LogDescription): Promise<string> {
        const inputs: string[] = [];
        for (let i = 0; i < description.eventFragment.inputs.length; i++) {
            const paramType = description.eventFragment.inputs[i];
            if (paramType.name && paramType.name.includes('0')) {
                const input =
                    paramType.name +
                    '[' +
                    (this.tokenAIsToken0 ? this.tokenATokenInfo.symbol : this.tokenBTokenInfo.symbol) +
                    ']' +
                    ':' +
                    this.parseTokenParam(paramType, description.args[i], this.tokenAIsToken0);
                inputs.push(input);
                continue;
            } else if (paramType.name && paramType.name.includes('1')) {
                const input =
                    paramType.name +
                    '[' +
                    (this.tokenAIsToken0 ? this.tokenBTokenInfo.symbol : this.tokenATokenInfo.symbol) +
                    ']' +
                    ':' +
                    this.parseTokenParam(paramType, description.args[i], this.tokenAIsToken0);
                inputs.push(input);
                continue;
            }
            inputs.push(`${await this.parseParam(description, paramType, description.args[i])}`);
        }

        return `${description.eventFragment.name}(${inputs.join(',')})`;
    }

    parseTokenParam(paramType: ethers.utils.ParamType, value: any, tokenAisToken0: boolean): string {
        switch (paramType.type) {
            case 'uint256':
            case 'uint112':
                if (paramType.name && paramType.name.includes('0')) {
                    return formatUnits(
                        value,
                        tokenAisToken0 ? this.tokenATokenInfo.decimals : this.tokenBTokenInfo.decimals,
                    );
                } else if (paramType.name && paramType.name.includes('1')) {
                    return formatUnits(
                        value,
                        tokenAisToken0 ? this.tokenBTokenInfo.decimals : this.tokenATokenInfo.decimals,
                    );
                } else {
                    return value.toString();
                }
            default:
                return value.toString();
        }
    }
}

export class UniswapV2RouterParser extends ContractParser {}

export class UniswapV3PoolParser extends ContractParser {
    tokenAIsToken0: boolean;

    constructor(
        iface: ethers.utils.Interface,
        public tokenATokenInfo: TokenInfo,
        public tokenBTokenInfo: TokenInfo,
        addressParser?: (address: string) => Promise<string>,
    ) {
        super(iface, addressParser);

        this.tokenAIsToken0 = tokenATokenInfo.address.toLowerCase() < tokenBTokenInfo.address.toLowerCase();
    }

    async parseEvent(description: ethers.utils.LogDescription): Promise<string> {
        const inputs: string[] = [];
        for (let i = 0; i < description.eventFragment.inputs.length; i++) {
            const paramType = description.eventFragment.inputs[i];
            if (paramType.name && paramType.name.includes('0')) {
                const input =
                    paramType.name +
                    '[' +
                    (this.tokenAIsToken0 ? this.tokenATokenInfo.symbol : this.tokenBTokenInfo.symbol) +
                    ']' +
                    ':' +
                    this.parseTokenParam(paramType, description.args[i], this.tokenAIsToken0);
                inputs.push(input);
                continue;
            } else if (paramType.name && paramType.name.includes('1')) {
                const input =
                    paramType.name +
                    '[' +
                    (this.tokenAIsToken0 ? this.tokenBTokenInfo.symbol : this.tokenATokenInfo.symbol) +
                    ']' +
                    ':' +
                    this.parseTokenParam(paramType, description.args[i], this.tokenAIsToken0);
                inputs.push(input);
                continue;
            }
            inputs.push(`${await this.parseParam(description, paramType, description.args[i])}`);
        }

        return `${description.eventFragment.name}(${inputs.join(',')})`;
    }

    parseTokenParam(paramType: ethers.utils.ParamType, value: any, tokenAisToken0: boolean): string {
        switch (paramType.type) {
            case 'int256':
                if (paramType.name && paramType.name.includes('0')) {
                    return formatUnits(
                        value,
                        tokenAisToken0 ? this.tokenATokenInfo.decimals : this.tokenBTokenInfo.decimals,
                    );
                } else if (paramType.name && paramType.name.includes('1')) {
                    return formatUnits(
                        value,
                        tokenAisToken0 ? this.tokenBTokenInfo.decimals : this.tokenATokenInfo.decimals,
                    );
                } else {
                    return value.toString();
                }
            default:
                return value.toString();
        }
    }
}

export class UniswapV3RouterParser extends ContractParser {}
