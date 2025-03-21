import { Plugin } from './plugin';
import { CallOverrides, ethers } from 'ethers';
import { BaseLogger, LoggerFactory, LogLevel } from './logger';
import { CHAIN_ID, DEFAULT_RETRY_OPTION, isSameAddress, transpose } from './utils';
import { BlockInfo, ChainInfo, TokenInfo } from './types';
import { getChainInfo } from './chain';
import {
    ERC20__factory,
    Multicall3,
    Multicall3__factory,
    TokenAssistant,
    TokenAssistant__factory,
    WrappedNative,
    WrappedNative__factory,
} from '@derivation-tech/contracts';
import { asL2Provider } from '@eth-optimism/sdk';
import { getProvider, getWssProvider, ContractParser, Erc20Parser } from './utils';
import { chunk } from 'lodash';
import asyncRetry from 'async-retry';
import { ContextCoreError } from './error';
import { Provider } from '@ethersproject/providers';

type InitHookFunction = () => Promise<void>;
type SetProviderHookFunction = () => void;

export interface BaseContext {
    use(plugin: Plugin): BaseContext;

    addInitHook(func: InitHookFunction): void;

    addSetProviderHook(func: SetProviderHookFunction): void;
}

export interface Option {
    providerOps?: {
        url?: string;
        wss?: string;
        receipt?: {
            timeout?: number;
            pollingInterval?: number;
        };
    };
    loggerOps?: {
        level?: LogLevel;
        logger?: BaseLogger;
    };
}

export const DEFAULT_OPTION: Partial<Option> = {
    loggerOps: {
        level: LogLevel.Info,
    },
};

export class Context implements BaseContext {
    private initHooks: InitHookFunction[] = [];
    private setProviderHooks: SetProviderHookFunction[] = [];

    info: ChainInfo;
    provider: ethers.providers.Provider;
    wssProvider?: ethers.providers.WebSocketProvider;
    logger: BaseLogger;
    wrappedNative: WrappedNative;
    tokenAssistant: TokenAssistant;
    multiCall3: Multicall3;
    tokenInfo: Map<string, TokenInfo> = new Map(); // symbol in lowercase | address in lowercase -> TokenInfo
    addressToName: Map<string, string> = new Map(); // address -> name in lowercase
    nameToAddress: Map<string, string> = new Map(); // name in lowercase -> address
    parsers: Map<string, ContractParser> = new Map();

    get chainId() {
        return this.info.chainId;
    }

    get chainName() {
        return this.info.chainName.toLowerCase();
    }

    get nativeToken() {
        return this.info.nativeToken;
    }

    get wrappedNativeToken() {
        return this.info.wrappedNativeToken;
    }

    public isNativeToken(symbolOrAddress: string): boolean {
        if (ethers.utils.isAddress(symbolOrAddress)) {
            return isSameAddress(symbolOrAddress, this.info.nativeToken.address);
        } else if (symbolOrAddress.toLowerCase() === this.info.nativeToken.symbol.toLowerCase()) {
            return true;
        }

        return false;
    }

    constructor(
        chanIdOrName: CHAIN_ID | string,
        providerOps?: { url: string } | { wss: string },
        option: Partial<Option> = DEFAULT_OPTION,
    ) {
        const info = getChainInfo(chanIdOrName);
        this._init(info, {
            ...option,
            providerOps,
        });
    }

    protected _init(info: ChainInfo, option: Option) {
        this.info = info;
        this._initLogger(option);
        if (option.providerOps?.url) {
            this.setProvider(
                getProvider(
                    option.providerOps.url,
                    option.providerOps?.receipt?.timeout,
                    option.providerOps?.receipt?.pollingInterval,
                ),
            );
        }
        if (option.providerOps?.wss) {
            this.wssProvider = getWssProvider(option.providerOps.wss, option.providerOps?.receipt?.pollingInterval);
        }
        this.registerTokenInfo(info.nativeToken);
        this.registerTokenInfo(info.wrappedNativeToken);
        info.erc20.forEach((tokenInfo: TokenInfo) => {
            this.registerTokenInfo(tokenInfo);
        });
    }

    protected _initLogger(option: Option) {
        if (option.loggerOps?.logger) {
            this.logger = option.loggerOps.logger;
            return;
        }
        const loggerName = `Context-${this.info.chainName}`;
        if (option.loggerOps?.level) {
            this.logger = LoggerFactory.getLogger(loggerName, option.loggerOps.level);
            return;
        }
        this.logger = LoggerFactory.getLogger(loggerName);
    }

    public async init() {
        for (let i = 0; i < this.initHooks.length; i++) {
            await this.initHooks[i]();
        }
    }

    public registerContractParser(address: string, parser: ContractParser) {
        if (!parser.addressParser) {
            parser.addressParser = async (addr: string) => this.getAddressName(addr);
        }
        this.parsers.set(address.toLowerCase(), parser);
    }

    public getAddressName(address: string): string {
        return this.addressToName.get(address.toLowerCase()) ?? 'UNKNOWN';
    }

    private registerTokenInfo(tokenInfo: TokenInfo) {
        this.tokenInfo.set(tokenInfo.symbol.toLowerCase(), tokenInfo);
        this.tokenInfo.set(tokenInfo.address.toLowerCase(), tokenInfo);
        this.registerAddress(tokenInfo.address, tokenInfo.symbol);
    }

    public registerAddress(address: string, name: string) {
        this.addressToName.set(address.toLowerCase(), name);
        this.nameToAddress.set(name.toLowerCase(), address);
    }

    public setProvider(provider: Provider, isOpSdkCompatible?: boolean) {
        if (!isOpSdkCompatible) {
            this.info.isOpSdkCompatible = false;
        }

        if (provider) {
            this.provider = this.info.isOpSdkCompatible ? asL2Provider(provider) : provider;
        }

        this.wrappedNative = WrappedNative__factory.connect(this.info.wrappedNativeToken.address, this.provider);
        this.tokenAssistant = TokenAssistant__factory.connect(this.info.tokenAssistant, this.provider);
        this.multiCall3 = Multicall3__factory.connect(this.info.multicall3, this.provider);

        this.registerContractParser(
            this.wrappedNativeToken.address,
            new Erc20Parser(this.wrappedNative.interface, this.info.wrappedNativeToken),
        );
        this.registerContractParser(this.info.multicall3, new ContractParser(this.multiCall3.interface));
        this.registerContractParser(this.info.tokenAssistant, new ContractParser(this.tokenAssistant.interface));
        this.registerAddress(this.info.multicall3, 'Multicall3');
        this.registerAddress(this.info.tokenAssistant, 'TokenAssistant');

        for (let i = 0; i < this.setProviderHooks.length; i++) {
            this.setProviderHooks[i]();
        }
    }

    public getContractParser(address: string): ContractParser | undefined {
        address = address.toLowerCase();
        let parser = this.parsers.get(address);
        if (parser) return parser;

        const tokenInfo = this.tokenInfo.get(address);
        // exclude zero address which is for native token
        if (tokenInfo && tokenInfo.address !== ethers.constants.AddressZero) {
            parser = new Erc20Parser(ERC20__factory.createInterface(), tokenInfo, async (addr: string) =>
                this.getAddressName(addr),
            );
            this.registerContractParser(address, parser);
        }
        return parser;
    }

    async balanceOfTokenBatch(tokens: string[], targets: string[], batch = 500, overrides?: CallOverrides) {
        // for now let's chunk only targets, not tokens, should be improved later, todo: fix this
        if (tokens.length > batch) throw new ContextCoreError(`${tokens.length} exceeds batch size ${batch}`);
        // chunk targets into smaller groups according to tokens.length as well as the specified batch size
        const chunks = chunk(targets, batch / tokens.length);
        // if block not specified, we need to lock current block number to achieve consistent result when batch
        overrides = overrides && overrides.blockTag ? overrides : { blockTag: await this.provider.getBlockNumber() };
        const bs = await Promise.all(
            chunks.map((chunk) => this.retry(() => this.tokenAssistant.balanceOfTokenBatch(tokens, chunk, overrides))),
        );
        const blockInfo: BlockInfo = {
            timestamp: bs[0].blockInfo.timestamp.toNumber(),
            height: bs[0].blockInfo.height.toNumber(),
        };
        // 2d balances array is indexed by target => token => balance, transpose to token => target => balance
        const balances: ethers.BigNumber[][] = transpose(bs.map((b) => b.balances).flat());
        return { blockInfo, balances };
    }

    public async getTokenInfo(symbolOrAddress: string): Promise<TokenInfo> {
        let info = this.tokenInfo.get(symbolOrAddress.toLowerCase());
        if (info === undefined && ethers.utils.isAddress(symbolOrAddress)) {
            try {
                const results = await this.retry(() => this.tokenAssistant.metaOfTokenBatch([symbolOrAddress]));
                info = {
                    address: results[0].token,
                    name: results[0].name,
                    symbol: results[0].symbol,
                    decimals: results[0].decimals,
                } as TokenInfo;

                // cache the result to reduce future on-chain query
                this.registerTokenInfo(info);

                return info;
            } catch (err) {
                throw new ContextCoreError(`Failed to get token info:  ${symbolOrAddress} ${err.toString()}`);
            }
        }

        return info as TokenInfo;
    }

    getExplorerTxLink(txHash: string): string {
        return this.info.explorer + '/tx/' + txHash;
    }

    getTokenAssistant(): TokenAssistant {
        return TokenAssistant__factory.connect(this.info.tokenAssistant, this.provider);
    }

    getMulticall3(): Multicall3 {
        return Multicall3__factory.connect(this.info.multicall3, this.provider);
    }

    retry<T>(func: () => Promise<T>, retryOption = DEFAULT_RETRY_OPTION) {
        return asyncRetry(func, retryOption);
    }

    use(plugin: Plugin) {
        plugin.install(this);
        return this;
    }

    addInitHook(func: InitHookFunction) {
        this.initHooks.push(func);
    }

    addSetProviderHook(func: SetProviderHookFunction) {
        this.setProviderHooks.push(func);
    }
}
