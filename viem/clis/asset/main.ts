#!/usr/bin/env node

import { Command } from 'commander';
import { parseAddresses, parseAmounts } from './utils';
import { handleBalance } from './balance';
import { handleTransfer } from './transfer';
import 'dotenv/config';

/**
 * Asset CLI - Simple asset management tool using viem-context
 * Supports balance queries and transfers for native & ERC20 tokens
 */

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
