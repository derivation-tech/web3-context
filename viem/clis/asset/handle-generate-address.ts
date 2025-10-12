import fs from 'fs';
import path from 'path';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { getAddress, type Address } from 'viem';
import { expandSignerIdPattern } from '../../utils/account';
import { LoggerFactory } from '../../index';
import { AddressBook } from '../../utils/address-book';

export async function handleGenerateAddress(options: any) {
    const { address: signerIdPattern, file } = options;

    const logger = LoggerFactory.getLogger('Generate::Address') as any;
    logger.setTimestamp(true);

    const dir = process.env.ADDRESS_PATH;
    if (!dir || !dir.trim()) throw new Error('ADDRESS_PATH is not set. Please set ADDRESS_PATH to the output directory.');
    const outDir = dir.trim();
    const outPath = path.join(outDir, file);
    fs.mkdirSync(outDir, { recursive: true });

    const signerIds: string[] = expandSignerIdPattern(signerIdPattern);

    const derive = (id: string): Address => {
        if (id.includes(':')) {
            const [name, index] = id.split(':');
            const envMnemonic = `${name.toUpperCase()}_MNEMONIC`;
            const mnemonic = process.env[envMnemonic];
            if (!mnemonic) throw new Error(`Mnemonic not found for ${name}. Set ${envMnemonic}.`);
            const account = mnemonicToAccount(mnemonic, { addressIndex: parseInt(index) || 0 });
            return getAddress(account.address as Address);
        }
        const upper = id.toUpperCase();
        const envMnemonic = `${upper}_MNEMONIC`;
        const envPrivateKey = `${upper}_PRIVATE_KEY`;
        const mnemonic = process.env[envMnemonic];
        const privateKey = process.env[envPrivateKey] as `0x${string}` | undefined;
        if (mnemonic && privateKey) throw new Error(`Both ${envMnemonic} and ${envPrivateKey} set.`);
        if (mnemonic) {
            const account = mnemonicToAccount(mnemonic, { addressIndex: 0 });
            return getAddress(account.address as Address);
        }
        if (privateKey) {
            const account = privateKeyToAccount(privateKey);
            return getAddress(account.address as Address);
        }
        throw new Error(`No credentials found for ${id}. Set ${envMnemonic} or ${envPrivateKey}.`);
    };

    const addressBook = new AddressBook();
    const existingSet = new Set<string>();
    if (fs.existsSync(outPath)) {
        const content = fs.readFileSync(outPath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const raw of lines) {
            const line = raw.trim();
            if (!line || line.startsWith('#') || line.startsWith('//')) continue;
            const [name, addr] = line.split(/\s+/);
            if (!name || !addr) continue;
            const checksummed = getAddress(addr as Address);
            addressBook.registerAddressName(checksummed, name);
            existingSet.add(`${name} ${checksummed}`);
        }
    }

    const newLines: string[] = [];
    for (const id of signerIds) {
        if (!id) continue;
        const addr = derive(id);
        addressBook.registerAddressName(addr, id);
        const entry = `${id} ${addr}`;
        if (!existingSet.has(entry)) newLines.push(entry);
    }

    if (newLines.length > 0) {
        const payload = newLines.join('\n') + '\n';
        if (existingSet.size > 0) fs.appendFileSync(outPath, payload, 'utf8');
        else fs.writeFileSync(outPath, payload, 'utf8');
    }
    logger.info(`📝 Wrote ${newLines.length} new entries to ${outPath}`);
}


