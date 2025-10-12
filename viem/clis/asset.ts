#!/usr/bin/env node

import { Command } from 'commander';
import { createPublicClient, createWalletClient, http, parseEther, formatEther, getAddress } from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { KitInstance, ERC20, type Address } from '../index';
import 'dotenv/config';

/**
 * Asset CLI - Simple asset management tool using viem-context
 * Supports balance queries and transfers for native & ERC20 tokens
 */

// Utility functions
function parseAddresses(value: string): Address[] {
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

function parseAmounts(value: string): string[] {
    return value.split(',').map((amount) => amount.trim());
}

function parseSigner(value: string): { name: string; index: number } {
    const [name, index] = value.split(':');
    return { name, index: parseInt(index) || 0 };
}

function getAddressFromMnemonic(name: string, index: number): Address {
    // Get mnemonic from environment variable based on name
    const mnemonicKey = `${name.toUpperCase()}_MNEMONIC`;
    const mnemonic = process.env[mnemonicKey];

    if (!mnemonic) {
        throw new Error(`Mnemonic not found for ${name}. Please set ${mnemonicKey} environment variable.`);
    }

    const account = mnemonicToAccount(mnemonic, { addressIndex: index });
    return account.address;
}

// Handler functions
async function handleBalance(args: string[], options: any) {
    const [tokenSymbols] = args;
    const { network, address, showkey } = options;

    console.log(`\n💰 Balance Query on ${network.toUpperCase()}\n`);

    // Get chain context
    const kit = KitInstance.for(network);
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
            for (const addr of address) {
                const balance = await ERC20.balanceOf(publicClient, tokenInfo.address, addr);
                const formatted = kit.formatErc20Amount(balance, tokenInfo.address);
                const name = kit.getAddressName(addr);
                console.log(`  ${name !== 'UNKNOWN' ? `[${name}]` : ''}${addr}: ${formatted}`);
            }
        }

        console.log(''); // Add spacing between tokens
    }
}

async function handleTransfer(args: string[], options: any) {
    const [tokenSymbol] = args;
    const { network, from, to, amounts, batch } = options;

    console.log(`\n💸 Transfer on ${network.toUpperCase()}\n`);

    // Get chain context
    const kit = KitInstance.for(network);
    const publicClient = createPublicClient({
        chain: kit.chain,
        transport: http(),
    });

    // Parse from addresses (support mnemonic format)
    const fromAddresses: Address[] = [];
    const accounts: any[] = [];

    for (const fromSpec of from) {
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
                console.error(`❌ Mnemonic not found for ${name}. Please set ${mnemonicKey} environment variable.`);
                return;
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
                    console.error('❌ No private key or mnemonic found in environment variables');
                    return;
                }
            } else {
                // Plain name: "alice" (same as "alice:0")
                fromAddress = getAddressFromMnemonic(fromSpec, 0);
                const mnemonicKey = `${fromSpec.toUpperCase()}_MNEMONIC`;
                const mnemonic = process.env[mnemonicKey];
                if (!mnemonic) {
                    console.error(
                        `❌ Mnemonic not found for ${fromSpec}. Please set ${mnemonicKey} environment variable.`
                    );
                    return;
                }
                account = mnemonicToAccount(mnemonic, { addressIndex: 0 });
            }
        }

        fromAddresses.push(fromAddress);
        accounts.push(account);
    }

    // Validate to addresses and amounts
    if (to.length !== amounts.length) {
        console.error('❌ Number of recipients must match number of amounts');
        return;
    }

    try {
        if (tokenSymbol === 'native' || tokenSymbol === 'eth') {
            // Native token transfers
            console.log(`📦 Processing ${to.length} native token transfers...`);

            for (let i = 0; i < to.length; i++) {
                const toAddress = to[i];
                const amountValue = amounts[i];
                const amountWei = parseEther(amountValue);

                // Cycle through from addresses if there are more to addresses
                const fromIndex = i % fromAddresses.length;
                const fromAddress = fromAddresses[fromIndex];
                const account = accounts[fromIndex];

                const walletClient = createWalletClient({
                    account,
                    chain: kit.chain,
                    transport: http(),
                });

                const hash = await walletClient.sendTransaction({
                    account,
                    to: toAddress,
                    value: amountWei,
                });

                console.log(`  ${i + 1}/${to.length} sent: ${hash}`);
                console.log(`     From: [${kit.getAddressName(fromAddress)}]${fromAddress}`);
                console.log(`     To: [${kit.getAddressName(toAddress)}]${toAddress}`);
                console.log(`     Amount: ${amountValue} ${kit.chain.nativeCurrency.symbol}`);

                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                console.log(`  ${i + 1}/${to.length} confirmed in block ${receipt.blockNumber}`);
            }
        } else {
            // ERC20 token transfers
            const tokenInfo = kit.getErc20TokenInfo(tokenSymbol);
            if (!tokenInfo) {
                console.error(`❌ Token ${tokenSymbol} not found`);
                return;
            }

            if (batch) {
                // Batch processing for ERC20 tokens
                console.log(`📦 Batch processing ${to.length} ${tokenInfo.symbol} transfers...`);

                // Group transactions by from address for batch processing
                const txGroups: { [key: string]: any[] } = {};

                for (let i = 0; i < to.length; i++) {
                    const toAddress = to[i];
                    const amountValue = amounts[i];
                    const fromIndex = i % fromAddresses.length;
                    const fromAddress = fromAddresses[fromIndex];

                    if (!txGroups[fromAddress]) {
                        txGroups[fromAddress] = [];
                    }

                    txGroups[fromAddress].push({
                        address: tokenInfo.address,
                        abi: ERC20.ERC20_ABI,
                        functionName: 'transfer' as const,
                        args: [toAddress, kit.parseErc20Amount(amountValue, tokenInfo.address)] as const,
                    });
                }

                // Process each group separately
                for (const [fromAddress, txs] of Object.entries(txGroups)) {
                    const fromIndex = fromAddresses.indexOf(fromAddress as Address);
                    const account = accounts[fromIndex];

                    const walletClient = createWalletClient({
                        account,
                        chain: kit.chain,
                        transport: http(),
                    });

                    console.log(
                        `  Processing ${txs.length} transfers from [${kit.getAddressName(fromAddress as Address)}]${fromAddress}`
                    );

                    const receipts = await ERC20.batchSendTxWithLog(publicClient, [walletClient], kit, txs);

                    console.log(`  ✅ ${receipts.length} transfers completed from ${fromAddress}`);
                    for (let i = 0; i < receipts.length; i++) {
                        console.log(`    ${i + 1}/${receipts.length}: ${receipts[i].transactionHash}`);
                    }
                }
            } else {
                // Sequential processing for ERC20 tokens
                console.log(`📦 Sequential processing ${to.length} ${tokenInfo.symbol} transfers...`);

                for (let i = 0; i < to.length; i++) {
                    const toAddress = to[i];
                    const amountValue = amounts[i];
                    const amountWei = kit.parseErc20Amount(amountValue, tokenInfo.address);

                    // Cycle through from addresses if there are more to addresses
                    const fromIndex = i % fromAddresses.length;
                    const fromAddress = fromAddresses[fromIndex];
                    const account = accounts[fromIndex];

                    const walletClient = createWalletClient({
                        account,
                        chain: kit.chain,
                        transport: http(),
                    });

                    const receipt = await ERC20.transfer(
                        publicClient,
                        walletClient,
                        kit,
                        tokenInfo.address,
                        toAddress,
                        amountWei
                    );

                    console.log(`  ${i + 1}/${to.length} completed: ${receipt.transactionHash}`);
                    console.log(`     From: [${kit.getAddressName(fromAddress)}]${fromAddress}`);
                    console.log(`     To: [${kit.getAddressName(toAddress)}]${toAddress}`);
                    console.log(`     Amount: ${amountValue} ${tokenInfo.symbol}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Transfer failed:', error);
    }

    console.log('');
}

const main = async () => {
    const program = new Command();
    program.name('asset').description('Simple asset management CLI using viem-context').version('1.0.0');

    // Balance command
    program
        .command('balance')
        .description('Query native/ERC20 token balances')
        .argument(
            '[tokens]',
            'Comma-separated list of tokens (native, wrappedNative, ERC20 symbols, or addresses)',
            'native'
        )
        .requiredOption('-n, --network <network>', 'Network name (e.g., base, ethereum, polygon)')
        .requiredOption(
            '--address <addresses>',
            'Comma-separated list of addresses (supports alice:0, bob:0-5, charlie)',
            parseAddresses
        )
        .option('--showkey', 'Show private keys (not implemented)')
        .action(handleBalance);

    // Transfer command
    program
        .command('transfer')
        .description('Transfer native/ERC20 tokens to multiple recipients')
        .argument('<token>', 'Token symbol (native, wrappedNative, or ERC20 symbol)')
        .requiredOption('-n, --network <network>', 'Network name')
        .requiredOption(
            '--from <addresses>',
            'Comma-separated list of sender addresses (supports alice:0, bob, or 0x... format)',
            parseAddresses
        )
        .requiredOption(
            '--to <addresses>',
            'Comma-separated list of recipient addresses (supports alice:0, bob:0-5, charlie)',
            parseAddresses
        )
        .requiredOption('--amounts <amounts>', 'Comma-separated list of amounts', parseAmounts)
        .option('--batch', 'Use batch processing for faster execution (ERC20 only)', false)
        .action(handleTransfer);

    await program.parseAsync(process.argv);
};

main().catch((err) => {
    console.error('❌ CLI Error:', err);
    process.exit(1);
});
