import type { Address } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { getAddress } from 'viem';
import { base, mainnet, arbitrum, optimism, polygon } from 'viem/chains';

/**
 * Utility functions for the Asset CLI
 *
 * Terminology:
 * - signerId: single signer identifier like "neo:0" or "neo" (alias for "neo:0")
 * - signerRange: contiguous range like "neo:0-10"
 * - signerList: comma-separated list like "neo:0-10,bob:0-100"
 */

/**
 * Get RPC URL for a given network with environment variable support
 * @param network - Network name (e.g., 'base', 'mainnet', 'arbitrum')
 * @returns RPC URL string
 */
export function getRpcUrl(network: string): string {
    // Check for specific network RPC environment variable
    const networkRpcKey = `${network.toUpperCase()}_RPC`;
    const networkRpc = process.env[networkRpcKey];
    if (networkRpc) {
        return networkRpc;
    }

    throw new Error(`RPC URL not found for ${network}. Please set ${networkRpcKey} environment variable.`);
}

/**
 * Parse comma-separated signer IDs into Address array
 * Supports formats: "alice:0", "bob:0-5", "charlie", "0x..."
 */
export function parseAddresses(value: string): Address[] {
    const addresses: Address[] = [];
    const parts = value.split(',');

    for (const part of parts) {
        const trimmed = part.trim();

        if (trimmed.includes(':')) {
            // Handle range format: "alice:0-5" or "bob:0"
            const [name, range] = trimmed.split(':');
            if (range.includes('-')) {
                // Range format: "alice:0-5"
                const [start, end] = range.split('-').map((n) => parseInt(n));
                for (let i = start; i <= end; i++) {
                    addresses.push(getAddressFromMnemonic(name, i));
                }
            } else {
                // Single index: "bob:0"
                const index = parseInt(range) || 0;
                addresses.push(getAddressFromMnemonic(name, index));
            }
        } else {
            // Plain name: "david" (same as "david:0")
            addresses.push(getAddressFromMnemonic(trimmed, 0));
        }
    }

    return addresses;
}

/**
 * Parse comma-separated amounts into string array
 */
export function parseAmounts(value: string): string[] {
    return value.split(',').map((amount) => amount.trim());
}

/**
 * Parse signer specification into name and index
 */
export function parseSigner(value: string): { name: string; index: number } {
    const [name, index] = value.split(':');
    return { name, index: parseInt(index) || 0 };
}

/**
 * Get address from mnemonic using environment variable
 */
export function getAddressFromMnemonic(name: string, index: number): Address {
    // Get mnemonic from environment variable based on name
    const mnemonicKey = `${name.toUpperCase()}_MNEMONIC`;
    const mnemonic = process.env[mnemonicKey];

    if (!mnemonic) {
        throw new Error(`Mnemonic not found for ${name}. Please set ${mnemonicKey} environment variable.`);
    }

    const account = mnemonicToAccount(mnemonic, { addressIndex: index });
    return account.address;
}


// preRegisterAddresses removed; getAccount handles registration & caching

/**
 * Create account from mnemonic or private key
 */
export function createAccountFromSignerId(signerId: string): { address: Address; account: any } {
    let fromAddress: Address;
    let account;

    if (signerId.includes(':')) {
        // Mnemonic format: "alice:0"
        const [name, index] = signerId.split(':');
        const indexNum = parseInt(index) || 0;
        fromAddress = getAddressFromMnemonic(name, indexNum);

        const mnemonicKey = `${name.toUpperCase()}_MNEMONIC`;
        const mnemonic = process.env[mnemonicKey];
        if (!mnemonic) {
            throw new Error(`Mnemonic not found for ${name}. Please set ${mnemonicKey} environment variable.`);
        }
        account = mnemonicToAccount(mnemonic, { addressIndex: indexNum });
    } else {
        // Direct address or plain name
        if (signerId.startsWith('0x')) {
            fromAddress = getAddress(signerId);
            // Try to get signer from environment
            if (process.env.PRIVATE_KEY) {
                account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
            } else if (process.env.MNEMONIC) {
                account = mnemonicToAccount(process.env.MNEMONIC, { addressIndex: 0 });
            } else {
                throw new Error('No private key or mnemonic found in environment variables');
            }
        } else {
            // Plain name: "alice" (same as "alice:0")
            fromAddress = getAddressFromMnemonic(signerId, 0);
            const mnemonicKey = `${signerId.toUpperCase()}_MNEMONIC`;
            const mnemonic = process.env[mnemonicKey];
            if (!mnemonic) {
                throw new Error(`Mnemonic not found for ${signerId}. Please set ${mnemonicKey} environment variable.`);
            }
            account = mnemonicToAccount(mnemonic, { addressIndex: 0 });
        }
    }

    return { address: fromAddress, account };
}
