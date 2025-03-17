import { ethers } from 'ethers';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { CallOption, ContractCallError, TxOptions } from './types';
import { PREFIX_SUB } from '@derivation-tech/context';
import { RIGHT_ARROW } from '@derivation-tech/context';
import { PREFIX } from '@derivation-tech/context';
import { Context } from '@derivation-tech/context';
import { formatEther, getContractAddress } from 'ethers/lib/utils';
import { getRevertReason, parseServerError } from './revert';
import chalk from 'chalk';
import { DEFAULT_CALL_OPTION } from './constants';
import { TxInterface } from './tx.interface';

export class TxModule implements TxInterface {
    core: Context;
    option: Required<CallOption>;

    constructor(core: Context, option = DEFAULT_CALL_OPTION) {
        this.core = core;
        this.option = {
            ...DEFAULT_CALL_OPTION,
            ...option,
        } as Required<CallOption>;
    }

    async sendTx(
        rawTx: ethers.PopulatedTransaction,
        txOptions?: TxOptions,
    ): Promise<ethers.providers.TransactionReceipt | ethers.PopulatedTransaction> {
        const ptx: ethers.PopulatedTransaction = { ...rawTx };

        // estimated gasPrice only if enabled
        if (txOptions?.enableGasPrice ?? this.option?.enableGasPrice) {
            let gasPriceOverrides: ethers.CallOverrides;
            if (!txOptions?.gasPrice && !txOptions?.maxPriorityFeePerGas && !txOptions?.maxFeePerGas) {
                gasPriceOverrides = await this.getGasPrice(
                    undefined,
                    txOptions?.gasPriceMultiple ?? this.option?.gasPriceMultiple,
                );
            } else {
                gasPriceOverrides = txOptions;
            }

            if (gasPriceOverrides.gasPrice) {
                ptx.gasPrice = ethers.BigNumber.from(await gasPriceOverrides.gasPrice);
            }
            if (gasPriceOverrides.maxPriorityFeePerGas) {
                ptx.maxPriorityFeePerGas = ethers.BigNumber.from(await gasPriceOverrides.maxPriorityFeePerGas);
            }
            if (gasPriceOverrides.maxFeePerGas) {
                ptx.maxFeePerGas = ethers.BigNumber.from(await gasPriceOverrides.maxFeePerGas);
            }
        }

        // estimated gasLimit only if not disabled
        if (!txOptions?.disableGasLimit && !this.option?.disableGasLimit) {
            if (!txOptions?.gasLimit) {
                let gasLimit = await this.provider.estimateGas({
                    from: txOptions?.from ?? (await txOptions?.signer?.getAddress()),
                    ...rawTx,
                });

                const gasLimitMultiple = txOptions?.gasLimitMultiple ?? this.option?.gasLimitMultiple;
                if (gasLimitMultiple) {
                    gasLimit = gasLimit.mul(Math.ceil(gasLimitMultiple * 100)).div(100);
                }

                ptx.gasLimit = gasLimit;
            } else {
                ptx.gasLimit = ethers.BigNumber.from(await txOptions.gasLimit);
            }
        }

        if (txOptions?.nonce) {
            ptx.nonce = ethers.BigNumber.from(await txOptions.nonce).toNumber();
        }

        if (txOptions?.type !== undefined) {
            ptx.type = ethers.BigNumber.from(await txOptions.type).toNumber();
        }

        if (txOptions?.accessList) {
            ptx.accessList = ethers.utils.accessListify(txOptions.accessList);
        }

        if (txOptions?.customData) {
            ptx.customData = txOptions.customData;
        }

        if (txOptions?.ccipReadEnabled !== undefined) {
            ptx.ccipReadEnabled = txOptions.ccipReadEnabled;
        }

        if (!txOptions?.signer) {
            return ptx;
        }

        return (await this._sendTx(txOptions.signer, ptx)) as ethers.providers.TransactionReceipt;
    }

    async _sendTx(
        signer: ethers.Signer,
        rawTx: ethers.PopulatedTransaction | Promise<ethers.PopulatedTransaction>,
    ): Promise<ethers.ContractTransaction | ethers.providers.TransactionReceipt> {
        let response;
        try {
            // wait for rawTx to be populated if it's a promise
            rawTx = await rawTx;

            rawTx.from = await signer.getAddress();

            await this.handleRequest(rawTx);

            // estimate gas price if not provided
            if (this.option.estimateGas && !rawTx.maxFeePerGas && !rawTx.maxPriorityFeePerGas && !rawTx.gasPrice) {
                const gasOption = await this.option.gasEstimator.getGasPrice(
                    this.chainId,
                    this.provider,
                    this.info.defaultTxType,
                    this.option.gasPriceMultiple,
                );
                rawTx = this.setGasPrice(rawTx, gasOption);
            }

            // estimate gas limit if not provided
            rawTx = await this.setGasLimit(signer, rawTx);

            // send tx
            response = await signer.sendTransaction(rawTx);

            if (!this.option.waitReceipt) {
                return response;
            }

            // handle response
            await this.handleResponse(response);

            const receipt = await this.provider.waitForTransaction(response.hash, 1, this.option.waitTimeout * 1000);

            // reverted, throw CALL_EXCEPTION for further handling error in one place
            if (receipt.status === 0) {
                // noinspection ExceptionCaughtLocallyJS
                throw {
                    code: ethers.errors.CALL_EXCEPTION,
                    reason: 'transaction failed',
                    transactionHash: receipt.transactionHash,
                    receipt: receipt,
                };
            }
            // handle receipt
            await this.handleReceipt(receipt, rawTx.gasLimit);
            return receipt;
        } catch (err) {
            this.logger.error('sendTx exception:', err);
            const error = await this.normalizeError(err);
            error.response = response;
            error.transactionHash = (err as any).transactionHash;
            // this.logger.error('sendTx exception:', err, error);
            throw error;
        }
    }

    async send2Txs(
        signers: ethers.Signer[],
        rawTxs: ethers.PopulatedTransaction[] | Promise<ethers.PopulatedTransaction>[],
    ): Promise<ethers.ContractTransaction[] | ethers.providers.TransactionReceipt[]> {
        if (rawTxs.length != 2) throw new Error('txs length should be 2');
        return this.batchSendTxs(signers, rawTxs);
    }

    async batchSendTxs(
        signers: ethers.Signer[],
        rawTxs: ethers.PopulatedTransaction[] | Promise<ethers.PopulatedTransaction>[],
    ): Promise<ethers.ContractTransaction[] | ethers.providers.TransactionReceipt[]> {
        if (signers.length != rawTxs.length) throw new Error('signers and txs length mismatched!');
        try {
            const _rawTxs = await Promise.all(rawTxs.map(async (rawTx) => await rawTx));
            await Promise.all(
                _rawTxs.map(async (rawTx, i) => {
                    rawTx.from = await signers[i].getAddress();
                    return await this.handleRequest(rawTx);
                }),
            );

            const needsGasPrice = _rawTxs
                .map((rawTx) => !rawTx.maxFeePerGas && !rawTx.maxPriorityFeePerGas && !rawTx.gasPrice)
                .reduce((a, b) => a || b, false);

            // estimate gas price if not provided
            if (this.option.estimateGas && needsGasPrice) {
                const gasOption = await this.option.gasEstimator.getGasPrice(
                    this.chainId,
                    this.provider,
                    this.info.defaultTxType,
                    this.option.gasPriceMultiple,
                );
                _rawTxs.forEach((rawTx, i) => (_rawTxs[i] = this.setGasPrice(rawTx, gasOption)));
            }

            // estimate gas limit if not provided
            for (let i = 0; i < _rawTxs.length; i++) {
                _rawTxs[i] = await this.setGasLimit(signers[i], _rawTxs[i]);
            }

            signers.forEach((signer) => signer._checkProvider('sendTransaction'));
            const txs = await Promise.all(_rawTxs.map(async (rawTx, i) => await signers[i].populateTransaction(rawTx)));
            const nonceMap = new Map();
            for (let i = 0; i < txs.length; i++) {
                const signerAddress = await signers[i].getAddress();
                if (!nonceMap.has(signerAddress)) {
                    nonceMap.set(signerAddress, await signers[i].provider?.getTransactionCount(signerAddress));
                }
                txs[i].nonce = ethers.BigNumber.from(nonceMap.get(signerAddress));
                nonceMap.set(signerAddress, nonceMap.get(signerAddress) + 1);
            }

            const signedTxs = await Promise.all(txs.map(async (tx, i) => await signers[i].signTransaction(tx)));

            const responses = await Promise.all(
                signedTxs.map(async (tx, i) => await signers[i].provider?.sendTransaction(tx)),
            );
            // Filter out any undefined responses before proceeding
            const validResponses = responses.filter((r): r is TransactionResponse => r !== undefined);

            if (!this.option.waitReceipt) {
                return validResponses;
            }

            await Promise.all(validResponses.map(async (r) => await this.handleResponse(r)));

            const receipts = await Promise.all(
                validResponses.map(
                    async (response) =>
                        await this.provider.waitForTransaction(response.hash, 1, this.option.waitTimeout * 1000),
                ),
            );

            // reverted, throw CALL_EXCEPTION for further handling error in one place
            const errors = receipts
                .filter((r) => r.status === 0)
                .map((r) => {
                    return {
                        code: ethers.errors.CALL_EXCEPTION,
                        reason: 'transaction failed',
                        transactionHash: r.transactionHash,
                        receipt: r,
                    };
                });
            if (errors.length > 0) throw errors;

            await Promise.all(
                receipts.map(async (receipt, i) => await this.handleReceipt(receipt, (await rawTxs[i]).gasLimit)),
            );
            return receipts;
        } catch (errs) {
            const _errs = Array.isArray(errs) ? errs : [errs];
            const errors = await Promise.all(_errs.map(async (err) => await this.normalizeError(err)));
            errors.forEach((error, i) => {
                this.logger.error('sendTx exception:', _errs[i], error);
            });
            throw errors;
        }
    }

    async getGasPrice(txType = this.info.defaultTxType, scale = 1.1) {
        return this.option.gasEstimator.getGasPrice(this.chainId, this.provider, txType, scale);
    }

    async handleRequest(rawTx: ethers.PopulatedTransaction): Promise<void> {
        try {
            const signerName = this.core.getAddressName(rawTx.from!);
            if (rawTx.data === undefined) {
                // native transfer
                this.logger.info(
                    PREFIX,
                    '  request',
                    RIGHT_ARROW,
                    chalk.magenta(this.chainName.toUpperCase()),
                    `[${signerName}]${rawTx.from} -> [${this.core.getAddressName(rawTx.to!)}]${rawTx.to}`,
                    chalk.blue(formatEther(rawTx.value!)) + ' ' + this.info.nativeToken.symbol,
                );
                return;
            }

            const isDeployment = rawTx.to === null; // rawTx.to is null in contract deployment
            const contractAddr = isDeployment
                ? getContractAddress({ from: rawTx.from!, nonce: rawTx.nonce! })
                : rawTx.to!;
            const parser = this.core.getContractParser(contractAddr);

            if (!parser) {
                return;
            }
            const parsedContractAddr = await parser.parseAddress(contractAddr);

            let parsed: string[];
            if (isDeployment) {
                parsed = [await parser.parseDeployment({ data: rawTx.data, value: rawTx.value })];
                this.logger.info(
                    PREFIX,
                    'deploying',
                    RIGHT_ARROW,
                    chalk.magenta(this.chainName.toUpperCase()),
                    'contract:',
                    parsedContractAddr,
                );
            } else {
                parsed = await parser.parseTransaction({ data: rawTx.data, value: rawTx.value });
            }

            if (parsed.length === 1) {
                const idx = parsed[0].indexOf('(');
                this.logger.info(
                    PREFIX,
                    '  request',
                    RIGHT_ARROW,
                    chalk.magenta(this.chainName.toUpperCase()),
                    `[${signerName}]${rawTx.from}`,
                    chalk.green(parsedContractAddr + '::' + parsed[0].substring(0, idx)) + parsed[0].substring(idx),
                );
            } else {
                // multicall
                this.logger.info(
                    PREFIX,
                    '  request',
                    RIGHT_ARROW,
                    chalk.magenta(this.chainName.toUpperCase()),
                    `[${signerName}]${rawTx.from}`,
                    chalk.green(parsedContractAddr + '::' + 'multicall'),
                );
                for (let i = 0; i < parsed.length; i++) {
                    const idx = parsed[i].indexOf('(');
                    this.logger.info(
                        PREFIX_SUB,
                        chalk.green(`[subcall-${i}]:` + parsed[i].substring(0, idx)) + parsed[i].substring(idx),
                    );
                }
            }
        } catch (err) {
            this.logger.error('handleRequest exception:', err);
        }
    }

    async handleResponse(response: TransactionResponse): Promise<void> {
        try {
            const overrides = this.formatOverrides({
                gasLimit: response.gasLimit,
                maxPriorityFeePerGas: response.maxPriorityFeePerGas,
                maxFeePerGas: response.maxFeePerGas,
                gasPrice: response.gasPrice,
                type: response.type as number | undefined,
                nonce: response.nonce,
                value: response.value,
            });
            this.logger.info(
                PREFIX,
                'submitted',
                RIGHT_ARROW,
                chalk.magenta(this.chainName.toUpperCase()),
                'txHash:',
                this.core.getExplorerTxLink(response.hash) + ',',
                overrides,
            );
        } catch (err) {
            this.logger.error('handleResponse exception:', err);
        }
    }

    // for local node, receipt.effectiveGasPrice && receipt.gasUsed are undefined
    static getTransactionFee(receipt: TransactionReceipt): number {
        if (receipt.effectiveGasPrice && receipt.gasUsed) {
            const gasPrice = Number(ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei'));
            const gasUsed = Number(receipt.gasUsed);
            return Number(ethers.utils.formatUnits((gasPrice * gasUsed).toFixed(0), 'gwei'));
        } else {
            return 0;
        }
    }

    // gasLimit is used for printing gas used percentage, it is optional
    async handleReceipt(receipt: TransactionReceipt, gasLimit?: ethers.BigNumberish): Promise<void> {
        const isDeployment = receipt.contractAddress !== null;
        try {
            const fee = TxModule.getTransactionFee(receipt);
            const percentage = gasLimit
                ? '(' + ((Number(receipt.gasUsed) * 100) / Number(gasLimit)).toFixed(2) + '%)'
                : '';
            this.logger.info(
                PREFIX,
                '   minted',
                RIGHT_ARROW,
                chalk.magenta(this.chainName.toUpperCase()),
                'blockNumber:',
                receipt.blockNumber + ',',
                'confirmations:',
                receipt.confirmations + ',',
                'gasUsed:',
                receipt.gasUsed.toString() + `${percentage},`,
                'gasPrice:',
                this.formatGas(receipt.effectiveGasPrice) + 'Gwei,',
                ...(this.info.isOpSdkCompatible
                    ? [
                          'l1GasUsed:',
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-expect-error
                          receipt.l1GasUsed.toString() + ',',
                          'l1GasPrice:',
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-expect-error
                          this.formatGas(receipt.l1GasPrice) + 'Gwei,',
                          'l1 tx fee:',
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-expect-error
                          Number(formatEther(receipt.l1Fee)).toFixed(6) + ',',
                          'l2 tx fee:',
                          fee.toFixed(6) + ',',
                          'total tx fee:',
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-expect-error
                          (fee + Number(formatEther(receipt.l1Fee))).toFixed(6),
                      ]
                    : ['tx fee:', fee.toFixed(6)]),
            );
            if (isDeployment) {
                const parser = this.core.getContractParser(receipt.contractAddress);
                const parsedContractAddr = parser
                    ? await parser.parseAddress(receipt.contractAddress)
                    : receipt.contractAddress;
                this.logger.info(
                    PREFIX,
                    ' deployed',
                    RIGHT_ARROW,
                    chalk.magenta(this.chainName.toUpperCase()),
                    'contract:',
                    parsedContractAddr,
                );
            }
            const printRawLog = (log) => {
                const addr = '[' + this.core.getAddressName(log.address) + ']' + log.address;
                this.logger.info(
                    PREFIX,
                    'raw event',
                    RIGHT_ARROW,
                    chalk.cyan('#' + log.logIndex, addr),
                    'data:',
                    log.data,
                    'topics:',
                    log.topics,
                );
            };

            for (const log of receipt.logs) {
                const parser = this.core.getContractParser(log.address);
                if (!parser) {
                    // no parser found, we need to print raw log
                    printRawLog(log);
                    continue;
                }
                let event;
                try {
                    event = parser.interface.parseLog(log);
                } catch (err) {
                    // parser found, however, no matching event found, we need print raw log
                    // this.logger.error('no matching event found for parser:', log.address, 'please check the abi file');
                    printRawLog(log);
                    continue;
                }
                const parsedEvent = await parser.parseEvent(event);
                const idx = parsedEvent.indexOf('(');
                this.logger.info(
                    PREFIX,
                    '    event',
                    RIGHT_ARROW,
                    chalk.cyan(
                        '#' + log.logIndex,
                        (await parser.parseAddress(log.address)) + '-' + parsedEvent.substring(0, idx),
                    ) + parsedEvent.substring(idx),
                );
            }
        } catch (err) {
            this.logger.error('handleReceipt exception:', err);
        }
    }

    private async setGasLimit(signer: ethers.Signer, tx: ethers.PopulatedTransaction) {
        if (!tx.gasLimit) {
            const estimatedGas = await signer.estimateGas(tx);
            // data is undefined indicates it's a native transfer, no need to scale
            const scaler = tx.data ? this.option.gasLimitMultiple : 1;
            const gasLimit = estimatedGas.toNumber() * scaler;
            tx.gasLimit = ethers.BigNumber.from(gasLimit.toFixed(0));
        }
        return tx;
    }

    private setGasPrice(tx: ethers.PopulatedTransaction, gasOption: ethers.Overrides) {
        if (gasOption.gasPrice) {
            tx.gasPrice = gasOption.gasPrice as ethers.BigNumber;
        } else {
            tx.maxFeePerGas = gasOption.maxFeePerGas as ethers.BigNumber;
            tx.maxPriorityFeePerGas = gasOption.maxPriorityFeePerGas as ethers.BigNumber;
        }
        return tx;
    }

    formatOverrides(overrides: ethers.PayableOverrides): string {
        if (!overrides) {
            return '';
        }
        const data: { [key: string]: string | undefined } = {
            nonce: overrides.nonce ? overrides.nonce.toString() : undefined,
            type: overrides.type ? overrides.type.toString() : undefined,
            value: overrides.value
                ? ethers.utils.formatUnits(overrides.value as ethers.BigNumberish, 'ether')
                : undefined,
            maxPriorityFee: this.formatGas(overrides.maxPriorityFeePerGas as ethers.BigNumber),
            maxFee: this.formatGas(overrides.maxFeePerGas as ethers.BigNumber),
            gasPrice: this.formatGas(overrides.gasPrice as ethers.BigNumber),
            gasLimit: overrides.gasLimit ? overrides.gasLimit.toString() : undefined,
        };
        let str = '';
        for (const key of Object.keys(data)) {
            if (!data[key]) {
                continue;
            }
            if (key === 'value' && Number(data[key]) === 0) {
                continue;
            }
            str += `${key}: ` + data[key] + ', ';
        }
        str = str.slice(0, -2);
        return str;
    }

    formatGas(gasPrice: ethers.BigNumberish): string {
        return gasPrice ? Number(ethers.utils.formatUnits(gasPrice, 'gwei')).toFixed(6) : '';
    }

    async normalizeError(e: any): Promise<ContractCallError> {
        try {
            if (!e.code) {
                return { raw: e, code: e.name, msg: e.message };
            }
            switch (e.code) {
                case ethers.errors.CALL_EXCEPTION: {
                    if (!e.receipt) {
                        // no receipt, return the original error
                        return { raw: e, code: e.code, msg: e.reason };
                    }
                    const abis = this.core.getContractParser(e.receipt?.to)
                        ? [this.core.getContractParser(e.receipt?.to)?.interface].filter((i) => i !== undefined)
                        : [];
                    const ret = await getRevertReason(this.provider, e.receipt.transactionHash, abis);
                    if (!ret) {
                        // no revert reason parsed, return the original error
                        return { raw: e, code: e.code, msg: e.message, receipt: e.receipt };
                    }
                    if (typeof ret === 'string') {
                        // traditional error msg
                        return { raw: e, code: e.code, msg: ret, receipt: e.receipt };
                    }
                    const parser = this.core.getContractParser(e.receipt?.to)!;
                    const msg = await parser.parseError(ret);
                    // custom error
                    return { raw: e, code: e.code, msg: msg, description: ret, receipt: e.receipt };
                }
                case 'SERVER_ERROR': {
                    return parseServerError(e, []);
                }
                case 'UNPREDICTABLE_GAS_LIMIT': {
                    const parser =
                        e.transaction && e.transaction.to ? this.core.getContractParser(e.transaction.to) : undefined;
                    const abis = parser ? [parser.interface] : [];
                    const ret = parseServerError(e.error, abis);
                    ret.code = e.code;
                    ret.transaction = e.transaction;
                    ret.msg =
                        parser && ret.description
                            ? e.reason + ': ' + (await parser.parseError(ret.description))
                            : ret.msg;
                    return ret;
                }
                default: {
                    return {
                        raw: e,
                        code: e.code,
                        msg: e.reason,
                        receipt: e.receipt,
                        transaction: e.transaction,
                    };
                }
            }
        } catch (err) {
            this.logger.error('normalizeError exception:', err);
            return e;
        }
    }

    get parsers() {
        return this.core.parsers;
    }

    get chainId() {
        return this.core.chainId;
    }

    get provider() {
        return this.core.provider;
    }

    get tokenInfo() {
        return this.core.tokenInfo;
    }

    get logger() {
        return this.core.logger;
    }

    get chainName() {
        return this.core.chainName;
    }

    get info() {
        return this.core.info;
    }
}
