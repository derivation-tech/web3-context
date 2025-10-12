import { createPublicClient, http, formatEther } from 'viem';
import type { Address } from 'viem';
import { ChainKitRegistry, ERC20 } from '../../index';
import { ERC20_ABI } from '../../abis';

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
    const { network, address } = options;

    console.log(`\n💰 Balance Query on ${network.toUpperCase()}\n`);

    // Get chain context
    const kit = ChainKitRegistry.for(network);
    const publicClient = createPublicClient({
        chain: kit.chain,
        transport: http(),
    });

    // Parse token symbols/addresses
    const tokens = tokenSymbols.split(',').map((t) => t.trim());

    // Process each token
    for (const token of tokens) {
        if (token === 'native' || token === 'eth') {
            // Native token balance
            console.log('📊 Native Token Balances:');
            for (const addr of address) {
                const balance = await publicClient.getBalance({ address: addr });
                const formatted = formatEther(balance);
                const name = kit.getAddressName(addr);
                console.log(
                    `  ${name !== 'UNKNOWN' ? `[${name}]` : ''}${addr}: ${formatted} ${kit.chain.nativeCurrency.symbol}`
                );
            }
        } else if (token === 'wrappedNative' || token === 'weth') {
            // Wrapped native token balance
            const wrappedToken = kit.getErc20TokenInfo(kit.chain.contracts?.wrappedEther?.address as Address);
            if (!wrappedToken) {
                console.error(`❌ Wrapped native token not found for this chain`);
                continue;
            }

            console.log(`📊 ${wrappedToken.symbol} Balances:`);
            for (const addr of address) {
                const balance = await ERC20.balanceOf(publicClient, wrappedToken.address, addr);
                const formatted = kit.formatErc20Amount(balance, wrappedToken.address);
                const name = kit.getAddressName(addr);
                console.log(`  ${name !== 'UNKNOWN' ? `[${name}]` : ''}${addr}: ${formatted}`);
            }
        } else {
            // ERC20 token balance - check if it's an address or symbol
            let tokenInfo;

            if (token.startsWith('0x')) {
                // Direct address
                tokenInfo = kit.getErc20TokenInfo(token as Address);
                if (!tokenInfo) {
                    console.error(`❌ Token at address ${token} not found in registry`);
                    continue;
                }
            } else {
                // Symbol lookup
                tokenInfo = kit.getErc20TokenInfo(token);
                if (!tokenInfo) {
                    console.error(
                        `❌ Token symbol ${token} not found. Available tokens: ${Array.from(kit.tokens.keys()).join(', ')}`
                    );
                    continue;
                }
            }

            console.log(`📊 ${tokenInfo.symbol} Balances:`);
            
            // Use multicall to batch balance queries and avoid rate limits
            try {
                const multicallResults = await publicClient.multicall({
                    contracts: address.map(addr => ({
                        address: tokenInfo.address,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [addr],
                    })),
                });

                for (let i = 0; i < address.length; i++) {
                    const addr = address[i];
                    const result = multicallResults[i];
                    
                    if (result.status === 'success') {
                        const balance = result.result as bigint;
                        const formatted = kit.formatErc20Amount(balance, tokenInfo.address);
                        const name = kit.getAddressName(addr);
                        console.log(`  ${name !== 'UNKNOWN' ? `[${name}]` : ''}${addr}: ${formatted}`);
                    } else {
                        console.log(`  ${addr}: Error - ${result.error?.message || 'Unknown error'}`);
                    }
                }
            } catch (error: any) {
                console.log(`  Error querying ${tokenInfo.symbol} balances: ${error.message}`);
                // Fallback to individual queries with delay
                for (const addr of address) {
                    try {
                        const balance = await ERC20.balanceOf(publicClient, tokenInfo.address, addr);
                        const formatted = kit.formatErc20Amount(balance, tokenInfo.address);
                        const name = kit.getAddressName(addr);
                        console.log(`  ${name !== 'UNKNOWN' ? `[${name}]` : ''}${addr}: ${formatted}`);
                        
                        // Add delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (err: any) {
                        console.log(`  ${addr}: Error - ${err.message}`);
                    }
                }
            }
        }

        console.log(''); // Add spacing between tokens
    }
}
