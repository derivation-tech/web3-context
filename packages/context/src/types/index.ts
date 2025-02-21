import { CHAIN_ID } from '../utils';

export interface ChainInfo {
	chainId: CHAIN_ID;
	chainName: string;
	chainAlias: string[];
	defaultTxType: TxType;
	isTestNet: boolean;
	isOpSdkCompatible: boolean;
	nativeToken: TokenInfo;
	wrappedNativeToken: TokenInfo;
	explorer: string;
	tokenAssistant: string;
	multicall3: string;
	erc20: TokenInfo[];
}

export interface TokenInfo {
	name?: string;
	symbol: string;
	address: string;
	decimals: number;
}

export type BlockInfo = {
	timestamp: number;
	height: number;
};

export enum TxType {
	LEGACY = 'legacy',
	EIP1559 = 'eip1559',
}
