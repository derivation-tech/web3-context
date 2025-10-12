// Main exports
export { ChainKit } from './chain-kit';
export { ChainKitRegistry } from './chain-kit-registry';
export { AddressBook } from './utils/address-book';
export { WRAPPED_NATIVE_TOKENS, getWrappedNativeToken } from './tokens/wrapped';
export { COMMON_ERC20_TOKENS, getCommonErc20Tokens } from './tokens/erc20';
export { createDefaultParser } from './parsers/default';
export { LoggerFactory, ConsoleLogger, LogLevel, type BaseLogger } from './utils/logger';
export { createERC20Parser } from './parsers/erc20';
export { createWETHParser } from './parsers/weth';
export { sendTxWithLog, sendTxSilent, batchSendTxWithLog, batchSendTxSilent, type TxRequest } from './utils/tx';
export { getAccount } from './utils/account';
export * as ERC20 from './contracts/erc20';
export * as WETH from './contracts/weth';
export * as Multicall from './contracts/multicall';

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
