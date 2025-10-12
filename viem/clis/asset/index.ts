#!/usr/bin/env node

import { Command } from 'commander';
import { parseAmounts } from './utils';
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
            '--address <signerIdPattern>',
            'Comma-separated signerIdPattern (signerId | signerIdRange | mixed). Examples: "neo:0", "neo" (alias of neo:0), "neo:0-10", "neo:0-10,bob:0-100"'
        )
        .option('--batch-size <size>', 'Number of addresses to query per batch (default: 500)', '500')
        .action((args, options) => {
            const batchSize = parseInt(options.batchSize) || 500;
            handleBalance(args, { ...options, addressPattern: options.address, batchSize });
        });

    // Transfer command
    program
        .command('transfer')
        .description('Transfer native/ERC20 tokens to multiple recipients')
        .argument('<token>', 'Token symbol (native, wrappedNative, or ERC20 symbol)')
        .requiredOption('-n, --network <network>', 'Network name')
        .requiredOption(
            '--from <signerIdPattern>',
            'Comma-separated signerIdPattern for senders (signerId | signerIdRange | mixed, or 0x... addresses). Examples: "neo:0", "alice", "bob:0-5"'
        )
        .requiredOption(
            '--to <signerIdPattern>',
            'Comma-separated signerIdPattern for recipients (signerId | signerIdRange | mixed). Examples: "neo:1", "bob:0-5,alice:0"'
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
