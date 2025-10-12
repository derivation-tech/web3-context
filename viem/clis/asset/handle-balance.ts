import { createPublicClient, http, formatEther, getAddress } from 'viem';
import type { Address } from 'viem';
import { ChainKitRegistry, Multicall, type Erc20TokenInfo, LoggerFactory, getAccount } from '../../index';
import { expandSignerIdPattern } from '../../utils/account';
import { getRpcUrl, readSignerAddressFiles } from './utils';
import 'dotenv/config';

// Polyfill fetch and Request for Node.js
import fetch, { Request } from 'node-fetch';
if (typeof globalThis.fetch === 'undefined') {
    (globalThis as any).fetch = fetch as any;
}
if (typeof globalThis.Request === 'undefined') {
    (globalThis as any).Request = Request as any;
}

export async function handleBalance(args: string, options: any) {
    const tokenSymbols = args;
    const { network, addressPattern, batchSize } = options;
    const logger = LoggerFactory.getLogger(`${network.charAt(0).toUpperCase() + network.slice(1)}::Balance`) as any;
    logger.setTimestamp(true);

    logger.info(`💰 Balance Query on ${network.toUpperCase()}`);

    const kit = ChainKitRegistry.for(network);
    const rpcUrl = getRpcUrl(network);
    const publicClient = createPublicClient({
        chain: kit.chain,
        transport: http(rpcUrl),
    });

    try {
        const entries = readSignerAddressFiles();
        for (const { name, address } of entries) {
            kit.registerAddressName(address, name);
        }
        if (entries.length > 0) {
            logger.info(`📚 Loaded ${entries.length} address mappings from files`);
        }
    } catch {}

    const signerIdList = expandSignerIdPattern(addressPattern);

    const addresses: Address[] = [];
    for (const id of signerIdList) {
        if (!id) continue;
        if (id.startsWith('0x')) {
            addresses.push(getAddress(id as Address));
            continue;
        }
        // Prefer existing entry in address book to avoid derivation/work
        const existing = kit.addressBook.getNamedAddress(id);
        if (existing) {
            addresses.push(getAddress(existing as Address));
            continue;
        }
        // Fallback to deriving from signerId; provide precise error if credentials missing
        try {
            const { account } = getAccount(kit, id);
            addresses.push(getAddress(account.address as Address));
        } catch (e: any) {
            const base = id.split(':')[0] || id;
            const upper = base.toUpperCase();
            const msg = `Missing address for signerId '${id}': not in address book and no ${upper}_MNEMONIC or ${upper}_PRIVATE_KEY set. Add a mapping in ADDRESS_PATH or set credentials.`;
            throw new Error(msg);
        }
    }

    const tokens = tokenSymbols.split(',').map((t) => t.trim()).filter(Boolean);

    const tokensToQuery: Array<{ info: Erc20TokenInfo; type: 'native' | 'wrapped' | 'erc20' }> = [
        { info: kit.nativeTokenInfo, type: 'native' },
        { info: kit.wrappedNativeTokenInfo, type: 'wrapped' }
    ];

    const addedAddresses = new Set<string>();
    addedAddresses.add(kit.nativeTokenInfo.address);
    addedAddresses.add(kit.wrappedNativeTokenInfo.address);

    const unknownTokenAddresses: Address[] = [];
    for (const token of tokens) {
        if (token === 'native' || token === 'eth') continue;

        let tokenInfo;
        if (token.startsWith('0x')) {
            tokenInfo = kit.getErc20TokenInfo(token as Address);
            if (!tokenInfo) {
                unknownTokenAddresses.push(getAddress(token as Address));
                continue;
            }
        } else {
            tokenInfo = kit.getErc20TokenInfo(token);
            if (!tokenInfo) {
                throw new Error(
                    `Unknown token symbol ${token}. Known tokens: ${Array.from(kit.tokens.keys()).join(', ')}`
                );
            }
        }

        if (!addedAddresses.has(tokenInfo.address)) {
            tokensToQuery.push({ info: tokenInfo, type: 'erc20' });
            addedAddresses.add(tokenInfo.address);
        }
    }

    if (unknownTokenAddresses.length > 0) {
        logger.info(`🔎 Resolving ${unknownTokenAddresses.length} ERC20 address(es) via multicall...`);
        try {
            const infos = await Multicall.getErc20TokenInfos(publicClient, unknownTokenAddresses);
            for (let i = 0; i < unknownTokenAddresses.length; i++) {
                const meta = infos[i];
                const addr = unknownTokenAddresses[i];
                if (meta) {
                    const info: Erc20TokenInfo = {
                        address: getAddress(addr),
                        symbol: meta.symbol,
                        name: meta.name,
                        decimals: meta.decimals,
                    };
                    kit.registerErc20Token(info);
                    if (!addedAddresses.has(info.address)) {
                        tokensToQuery.push({ info, type: 'erc20' });
                        addedAddresses.add(info.address);
                    }
                    logger.info(`✅ Registered ${info.symbol} (${info.address})`);
                } else {
                    logger.warn(`⚠️ Could not resolve ERC20 metadata for ${addr}`);
                }
            }
        } catch (e: any) {
            logger.warn(`⚠️ Failed to resolve ERC20 metadata via multicall: ${e?.message || e}`);
        }
    }

    const addressBalances: Array<{ address: Address; name: string; balances: Array<{ symbol: string; balance: bigint; formatted: string }> }> = [];
    const nativeBalances = await Multicall.getNativeBalances(publicClient, addresses, batchSize);

    const erc20TokenAddresses: Address[] = [];
    const erc20TokenMap: Array<{ info: Erc20TokenInfo; index: number }> = [];

    const hasWrappedInUserTokens = tokensToQuery.slice(2).some(t => t.info.address === kit.wrappedNativeTokenInfo.address);
    if (!hasWrappedInUserTokens) {
        erc20TokenAddresses.push(kit.wrappedNativeTokenInfo.address);
        erc20TokenMap.push({ info: kit.wrappedNativeTokenInfo, index: 0 });
    }

    for (let i = 2; i < tokensToQuery.length; i++) {
        const tokenQuery = tokensToQuery[i];
        erc20TokenAddresses.push(tokenQuery.info.address);
        erc20TokenMap.push({ info: tokenQuery.info, index: erc20TokenAddresses.length - 1 });
    }

    const erc20Balances = await Multicall.getMultipleErc20Balances(publicClient, erc20TokenAddresses, addresses, batchSize);

    for (let i = 0; i < addresses.length; i++) {
        const addr = addresses[i];
        const name = kit.getAddressName(addr);
        const balances: Array<{ symbol: string; balance: bigint; formatted: string }> = [];
        balances.push({
            symbol: kit.nativeTokenInfo.symbol,
            balance: nativeBalances[i],
            formatted: `${formatEther(nativeBalances[i])} ${kit.nativeTokenInfo.symbol}`
        });
        for (const tokenMap of erc20TokenMap) {
            const balance = erc20Balances[tokenMap.index][i];
            balances.push({
                symbol: tokenMap.info.symbol,
                balance: balance,
                formatted: kit.formatErc20Amount(balance, tokenMap.info.address)
            });
        }
        addressBalances.push({ address: addr, name, balances });
    }

    logger.info('📊 Balance Summary:');
    for (const addrData of addressBalances) {
        const balanceStrings = addrData.balances.map(b => b.formatted).join(', ');
        logger.info(`  [${addrData.name}]${addrData.address}: ${balanceStrings}`);
    }

    const totalStrings: string[] = [];
    const nativeTotal = addressBalances.reduce((sum, addrData) => sum + addrData.balances[0].balance, 0n);
    totalStrings.push(`${formatEther(nativeTotal)} ${kit.nativeTokenInfo.symbol}`);
    for (const tokenMap of erc20TokenMap) {
        const total = addressBalances.reduce((sum, addrData) => {
            const tokenBalance = addrData.balances.find(b => b.symbol === tokenMap.info.symbol);
            return sum + (tokenBalance?.balance || 0n);
        }, 0n);
        totalStrings.push(kit.formatErc20Amount(total, tokenMap.info.address));
    }
    logger.info(`📊 Totals: ${totalStrings.join(', ')}`);
}


