import type { Address } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { getAddress } from 'viem';

/**
 * Utility functions for the Asset CLI
 */

/**
 * Parse comma-separated address specifications into Address array
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

/**
 * Extract address name from mnemonic-derived address
 * This is a reverse lookup to determine which mnemonic name generated this address
 */
export function extractAddressName(address: Address): string | null {
    // Try common mnemonic names and indices to find a match
    const commonNames = ['neo', 'alice', 'bob', 'charlie', 'david'];
    
    for (const name of commonNames) {
        const mnemonicKey = `${name.toUpperCase()}_MNEMONIC`;
        const mnemonic = process.env[mnemonicKey];
        
        if (mnemonic) {
            // Check indices 0-1000 to find a match
            for (let i = 0; i <= 1000; i++) {
                try {
                    const derivedAddress = getAddressFromMnemonic(name, i);
                    if (derivedAddress.toLowerCase() === address.toLowerCase()) {
                        return `${name}:${i}`;
                    }
                } catch {
                    // Skip if mnemonic is invalid
                    break;
                }
            }
        }
    }
    
    return null;
}

/**
 * Create account from mnemonic or private key
 */
export function createAccountFromSpec(fromSpec: string): { address: Address; account: any } {
    let fromAddress: Address;
    let account;

    if (fromSpec.includes(':')) {
        // Mnemonic format: "alice:0"
        const [name, index] = fromSpec.split(':');
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
        if (fromSpec.startsWith('0x')) {
            fromAddress = getAddress(fromSpec);
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
            fromAddress = getAddressFromMnemonic(fromSpec, 0);
            const mnemonicKey = `${fromSpec.toUpperCase()}_MNEMONIC`;
            const mnemonic = process.env[mnemonicKey];
            if (!mnemonic) {
                throw new Error(`Mnemonic not found for ${fromSpec}. Please set ${mnemonicKey} environment variable.`);
            }
            account = mnemonicToAccount(mnemonic, { addressIndex: 0 });
        }
    }

    return { address: fromAddress, account };
}
