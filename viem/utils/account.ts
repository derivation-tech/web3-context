import type { Address, Account } from 'viem';
import { getAddress } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import type { ChainKit } from '../chain-kit';

// In-memory cache of derived accounts for the current process
const accountCache = new Map<string, Account>();
/**
 * Derive account from a signer identifier or named private key.
 * Rules:
 * - "name:index" → uses NAME_MNEMONIC at given index; registers "name:index"
 * - "name" → prefers NAME_MNEMONIC (index 0), else NAME_PRIVATE_KEY; if both exist, throws
 * - Raw addresses like "0x..." are NOT accepted here
 */
export function getAccount(
    kit: ChainKit,
    signerIdOrPrivateKeyName: string
): { account: Account } {
    let derivedAddress: Address;
    let account: Account;

    if (signerIdOrPrivateKeyName.includes(':')) {
        const [name, index] = signerIdOrPrivateKeyName.split(':');
        const indexNum = parseInt(index) || 0;
        const upper = name.toUpperCase();
        const cacheKey = `${upper}:${indexNum}`;

        const cached = accountCache.get(cacheKey);
        if (cached) {
            return { account: cached };
        }
        const envMnemonic = `${upper}_MNEMONIC`;
        const mnemonic = process.env[envMnemonic];
        if (!mnemonic) {
            throw new Error(`Mnemonic not found for ${name}. Please set ${envMnemonic} environment variable.`);
        }
        account = mnemonicToAccount(mnemonic, { addressIndex: indexNum }) as unknown as Account;
        derivedAddress = getAddress(account.address as Address);
        kit.registerAddressName(derivedAddress, `${name}:${indexNum}`);
        accountCache.set(cacheKey, account);
        return { account };
    }

    const name = signerIdOrPrivateKeyName;
    const upper = name.toUpperCase();

    const cacheKey = `${upper}`;
    const cached = accountCache.get(cacheKey);
    if (cached) {
        return { account: cached };
    }

    const envMnemonic = `${upper}_MNEMONIC`;
    const envPrivateKey = `${upper}_PRIVATE_KEY`;
    const mnemonic = process.env[envMnemonic];
    const privateKey = process.env[envPrivateKey] as `0x${string}` | undefined;

    if (mnemonic && privateKey) {
        throw new Error(`Both ${envMnemonic} and ${envPrivateKey} are set. Please provide only one.`);
    }

    if (mnemonic) {
        account = mnemonicToAccount(mnemonic, { addressIndex: 0 }) as unknown as Account;
        derivedAddress = getAddress(account.address as Address);
        kit.registerAddressName(derivedAddress, `${name}:0`);
        accountCache.set(cacheKey, account);
        return { account };
    }

    if (privateKey) {
        account = privateKeyToAccount(privateKey) as unknown as Account;
        derivedAddress = getAddress(account.address as Address);
        kit.registerAddressName(derivedAddress, name);
        accountCache.set(cacheKey, account);
        return { account };
    }

    throw new Error(`No credentials found. Set ${envMnemonic} or ${envPrivateKey}.`);
}



/**
 * Expand a signerIdPattern into a list of signerIds.
 * Examples:
 *  - "alice:0-10,bob:0,charlie" → ["alice:0".."alice:10","bob:0","charlie:0"]
 *  - Supports whitespace and direct 0x addresses (kept as-is)
 */
export function expandSignerIdPattern(signerIdPattern: string): string[] {
    if (!signerIdPattern) return [];

    const result: string[] = [];
    const parts = signerIdPattern.split(',');

    for (const raw of parts) {
        const part = raw.trim();
        if (!part) continue;

        // Keep raw addresses as-is
        if (part.startsWith('0x')) {
            result.push(part);
            continue;
        }

        if (part.includes(':')) {
            const [name, range] = part.split(':');
            const trimmedName = name.trim();
            if (range.includes('-')) {
                const [startStr, endStr] = range.split('-');
                let start = parseInt(startStr);
                let end = parseInt(endStr);
                if (Number.isNaN(start)) start = 0;
                if (Number.isNaN(end)) end = start;
                if (end < start) [start, end] = [end, start];
                for (let i = start; i <= end; i++) {
                    result.push(`${trimmedName}:${i}`);
                }
            } else {
                const index = parseInt(range);
                result.push(`${trimmedName}:${Number.isNaN(index) ? 0 : index}`);
            }
        } else {
            // Plain name → default index 0
            result.push(`${part}:0`);
        }
    }

    return result;
}

