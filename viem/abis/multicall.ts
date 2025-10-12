import { parseAbi } from 'viem';

/**
 * Multicall3 contract ABI
 * Used for efficient batch queries of native token balances
 */
export const MULTICALL3_ABI = parseAbi([
    'function getEthBalance(address account) view returns (uint256 balance)',
]);
