import { createPublicClient, http, formatEther, getAddress } from 'viem';
import type { Address } from 'viem';
import { ChainKitRegistry, Multicall, type Erc20TokenInfo, LoggerFactory, getAccount } from '../../index';
import { expandSignerIdPattern } from '../../utils/account';
import { getRpcUrl } from './utils';

// Polyfill fetch and Request for Node.js
import fetch, { Request } from 'node-fetch';
if (typeof globalThis.fetch === 'undefined') {
    globalThis.fetch = fetch as any;
}
if (typeof globalThis.Request === 'undefined') {
    globalThis.Request = Request as any;
}

/**
 * Balance command handler
 */

export async function handleBalance(args: string, options: any) {
    const tokenSymbols = args;
    const { network, addressPattern, batchSize } = options;
    const logger = LoggerFactory.getLogger(`${network.charAt(0).toUpperCase() + network.slice(1)}::Balance`) as any;
    logger.setTimestamp(true);

    logger.info(`💰 Balance Query on ${network.toUpperCase()}`);

    // Get chain context
    const kit = ChainKitRegistry.for(network);
    const rpcUrl = getRpcUrl(network);
    const publicClient = createPublicClient({
        chain: kit.chain,
        transport: http(rpcUrl),
    });

    const signerIdList = expandSignerIdPattern(addressPattern);

    // Build addresses from expanded signerIdPattern via getAccount; keep 0x addresses as-is.
    const addresses: Address[] = [];
    for (const id of signerIdList) {
        if (!id) continue;
        if (id.startsWith('0x')) {
            addresses.push(getAddress(id as Address));
            continue;
        }
        const { account } = getAccount(kit, id);
        addresses.push(getAddress(account.address as Address));
    }

    // Parse token symbols/addresses
    const tokens = tokenSymbols.split(',').map((t) => t.trim()).filter(Boolean);

    // Collect all token info we need to query
    const tokensToQuery: Array<{ info: Erc20TokenInfo; type: 'native' | 'wrapped' | 'erc20' }> = [
        { info: kit.nativeTokenInfo, type: 'native' },
        { info: kit.wrappedNativeTokenInfo, type: 'wrapped' }
    ];

    // Add user-specified tokens (avoid duplicates)
    const addedAddresses = new Set<string>();
    addedAddresses.add(kit.nativeTokenInfo.address);
    addedAddresses.add(kit.wrappedNativeTokenInfo.address);

    const unknownTokenAddresses: Address[] = [];
    for (const token of tokens) {
        // Skip native token as it's already handled above
        if (token === 'native' || token === 'eth') {
            continue;
        }

        let tokenInfo;
        if (token.startsWith('0x')) {
            // Direct address
            tokenInfo = kit.getErc20TokenInfo(token as Address);
            if (!tokenInfo) {
                // Defer resolution via multicall
                unknownTokenAddresses.push(getAddress(token as Address));
                continue;
            }
        } else {
            // Symbol lookup
            tokenInfo = kit.getErc20TokenInfo(token);
            if (!tokenInfo) {
                throw new Error(
                    `Unknown token symbol ${token}. Known tokens: ${Array.from(kit.tokens.keys()).join(', ')}`
                );
            }
        }

        // Avoid duplicates
        if (!addedAddresses.has(tokenInfo.address)) {
            tokensToQuery.push({ info: tokenInfo, type: 'erc20' });
            addedAddresses.add(tokenInfo.address);
        }
    }

    // Resolve unknown ERC20 addresses via multicall, then register & include
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

    // Collect all balances for each address using multicall
    const addressBalances: Array<{ address: Address; name: string; balances: Array<{ symbol: string; balance: bigint; formatted: string }> }> = [];

    // Query native token balances using multicall3 getEthBalance with batching
    const nativeBalances = await Multicall.getNativeBalances(publicClient, addresses, batchSize);

    // Query all ERC20 token balances using multicall with batching
    // Collect unique ERC20 token addresses (including wrapped native if not already specified)
    const erc20TokenAddresses: Address[] = [];
    const erc20TokenMap: Array<{ info: Erc20TokenInfo; index: number }> = [];

    // Add wrapped native token if not already in user-specified tokens
    const hasWrappedInUserTokens = tokensToQuery.slice(2).some(t => t.info.address === kit.wrappedNativeTokenInfo.address);
    if (!hasWrappedInUserTokens) {
        erc20TokenAddresses.push(kit.wrappedNativeTokenInfo.address);
        erc20TokenMap.push({ info: kit.wrappedNativeTokenInfo, index: 0 });
    }

    // Add user-specified tokens
    let userTokenStartIndex = erc20TokenAddresses.length;
    for (let i = 2; i < tokensToQuery.length; i++) {
        const tokenQuery = tokensToQuery[i];
        erc20TokenAddresses.push(tokenQuery.info.address);
        erc20TokenMap.push({ info: tokenQuery.info, index: erc20TokenAddresses.length - 1 });
    }

    const erc20Balances = await Multicall.getMultipleErc20Balances(publicClient, erc20TokenAddresses, addresses, batchSize);

    // Combine all balances for each address
    for (let i = 0; i < addresses.length; i++) {
        const addr = addresses[i];
        const name = kit.getAddressName(addr);
        const balances: Array<{ symbol: string; balance: bigint; formatted: string }> = [];

        // Add native token balance
        balances.push({
            symbol: kit.nativeTokenInfo.symbol,
            balance: nativeBalances[i],
            formatted: `${formatEther(nativeBalances[i])} ${kit.nativeTokenInfo.symbol}`
        });

        // Add ERC20 token balances using the mapping
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

    // Print results - one line per address
    logger.info('📊 Balance Summary:');
    for (const addrData of addressBalances) {
        const balanceStrings = addrData.balances.map(b => b.formatted).join(', ');
        logger.info(`  [${addrData.name}]${addrData.address}: ${balanceStrings}`);
    }

    // Print totals - one line
    const totalStrings: string[] = [];

    // Calculate native token total
    const nativeTotal = addressBalances.reduce((sum, addrData) => sum + addrData.balances[0].balance, 0n);
    totalStrings.push(`${formatEther(nativeTotal)} ${kit.nativeTokenInfo.symbol}`);

    // Calculate ERC20 token totals using the mapping
    for (const tokenMap of erc20TokenMap) {
        const total = addressBalances.reduce((sum, addrData) => {
            // Find the balance for this token in the address balances
            const tokenBalance = addrData.balances.find(b => b.symbol === tokenMap.info.symbol);
            return sum + (tokenBalance?.balance || 0n);
        }, 0n);
        totalStrings.push(kit.formatErc20Amount(total, tokenMap.info.address));
    }

    logger.info(`📊 Totals: ${totalStrings.join(', ')}`);
}
