// Main exports
export { ChainKit } from './chain-kit';
export { KitInstance } from './kit-instance';
export { AddressBook } from './address-book';
export { WRAPPED_NATIVE_TOKENS, getWrappedNativeToken } from './tokens/wrapped';
export { COMMON_ERC20_TOKENS, getCommonErc20Tokens } from './tokens/erc20';
export { createDefaultParser } from './parsers/default';
export { LoggerFactory, ConsoleLogger, LogLevel, type BaseLogger } from './logger';
export { createERC20Parser } from './parsers/erc20';
export { createWETHParser } from './parsers/weth';
export { sendTxWithLog, sendTxSilent, batchSendTxWithLog, batchSendTxSilent, type TxRequest } from './tx-helpers';
export * as ERC20 from './erc20';
export * as WETH from './weth';

// Type exports
export type { Erc20TokenInfo, ContractParser } from './types';

// Re-export commonly used viem types
export type { Address, Hash, Hex, Account, PublicClient, WalletClient, TransactionReceipt } from 'viem';

// Re-export commonly used viem functions
export {
    parseAbi,
    parseUnits,
    formatUnits,
    parseEther,
    formatEther,
    parseGwei,
    formatGwei,
    isAddress,
    getAddress,
    isAddressEqual,
    keccak256,
    toHex,
    toBytes,
    encodeFunctionData,
    decodeFunctionResult,
    decodeEventLog,
} from 'viem';

export { privateKeyToAccount, mnemonicToAccount, hdKeyToAccount } from 'viem/accounts';
