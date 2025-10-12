/**
 * Transaction Helpers - Standalone utilities for sending transactions
 *
 * Provides beautiful logging with ChainKit integration
 * Works with any viem clients
 */

import type { PublicClient, WalletClient, Address, TransactionReceipt, Abi, Hash } from 'viem';
import { parseAbi, decodeEventLog, formatEther, encodeFunctionData } from 'viem';
import chalk from 'chalk';
import type { ChainKit } from './chain-kit';

export type TxRequest = {
    address: Address;
    abi: Abi | string[];
    functionName: string;
    args?: readonly unknown[];
} & Partial<{
    value: bigint;
    gas: bigint;
    gasPrice: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    nonce: number;
}>;

/**
 * Send transaction with full logging
 *
 * Flow: Build calldata → Log → Send → Wait → Parse events
 */
export async function sendTxWithLog(
    publicClient: PublicClient,
    walletClient: WalletClient,
    kit: ChainKit,
    txRequest: TxRequest
): Promise<TransactionReceipt> {
    const parsedAbi =
        Array.isArray(txRequest.abi) && typeof txRequest.abi[0] === 'string'
            ? parseAbi(txRequest.abi as string[])
            : txRequest.abi;

    // ==========================================
    // STEP 1: Log request (before sending)
    // ==========================================
    const parser = kit.getParser(txRequest.address);

    const txDescription = parser?.parseTransaction
        ? await parser.parseTransaction({
              functionName: txRequest.functionName,
              args: txRequest.args as any[],
          })
        : `${txRequest.functionName}(${(txRequest.args as any[])?.join(', ') || ''})`;

    const contractName = kit.getAddressName(txRequest.address);

    const senderName = kit.getAddressName(walletClient.account!.address);

    console.log(
        '📦',
        chalk.blue('request →'),
        chalk.magenta(kit.chain.name.toUpperCase()),
        `[${senderName}]${walletClient.account!.address}`,
        chalk.green(`${contractName}::`) + txDescription
    );

    // ==========================================
    // STEP 2: Send transaction
    // ==========================================
    const hash = await walletClient.writeContract({
        ...txRequest,
        abi: parsedAbi,
    } as any);

    const explorerLink = `${kit.chain.blockExplorers?.default?.url || ''}/tx/${hash}`;
    console.log('📦', chalk.blue('submitted →'), chalk.magenta(kit.chain.name.toUpperCase()), 'txHash:', explorerLink);

    // ==========================================
    // STEP 3: Wait for receipt
    // ==========================================
    const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
    });

    // ==========================================
    // STEP 4: Log receipt
    // ==========================================
    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = receipt.effectiveGasPrice;
    const txFee = gasUsed * effectiveGasPrice;

    console.log(
        '📦',
        chalk.blue('minted →'),
        chalk.magenta(kit.chain.name.toUpperCase()),
        'block:',
        receipt.blockNumber.toString() + ',',
        'gasUsed:',
        gasUsed.toString() + ',',
        'fee:',
        formatEther(txFee)
    );

    // ==========================================
    // STEP 5: Parse and log events
    // ==========================================
    for (const log of receipt.logs) {
        const parser = kit.getParser(log.address);
        if (parser) {
            try {
                const decoded = decodeEventLog({
                    abi: parseAbi(parser.abi),
                    data: log.data,
                    topics: log.topics,
                    strict: false,
                });

                const formatted: string =
                    (await parser.parseEvent?.({
                        eventName: decoded.eventName,
                        args: decoded.args as Record<string, any>,
                    })) ?? `${decoded.eventName || 'Unknown'}(...)`;

                console.log('📦', chalk.blue('event →'), chalk.cyan(`#${log.logIndex} ${formatted}`));
            } catch (err) {
                // Couldn't decode, skip
            }
        }
    }

    console.log('');
    return receipt;
}

/**
 * Send transaction without logging (silent mode)
 */
export async function sendTxSilent(
    publicClient: PublicClient,
    walletClient: WalletClient,
    txRequest: TxRequest
): Promise<TransactionReceipt> {
    const parsedAbi =
        Array.isArray(txRequest.abi) && typeof txRequest.abi[0] === 'string'
            ? parseAbi(txRequest.abi as string[])
            : txRequest.abi;

    const hash = await walletClient.writeContract({
        ...txRequest,
        abi: parsedAbi,
    } as any);

    return await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Internal: Prepare and sign all transactions
 */
async function prepareAndSignBatch(
    publicClient: PublicClient,
    walletClients: WalletClient[],
    txs: TxRequest[]
): Promise<{ wallet: WalletClient; serialized: `0x${string}`; addr: Address }[]> {
    // Get unique accounts
    const uniqueAddresses = Array.from(
        new Set(walletClients.map((w) => w.account?.address).filter((a): a is Address => a !== undefined))
    );

    // Batch fetch nonces (viem's batch transport combines into 1 HTTP request!)
    const nonces = await Promise.all(
        uniqueAddresses.map((addr) => publicClient.getTransactionCount({ address: addr }))
    );

    const nonceMap = new Map<Address, number>();
    uniqueAddresses.forEach((addr, i) => nonceMap.set(addr, nonces[i]));

    // Prepare and sign all transactions
    return await Promise.all(
        txs.map(async (tx, i) => {
            const wallet = walletClients[i];
            if (!wallet.account) throw new Error(`Wallet ${i} has no account`);

            const parsedAbi =
                Array.isArray(tx.abi) && typeof tx.abi[0] === 'string' ? parseAbi(tx.abi as string[]) : tx.abi;

            // Get and increment nonce
            const addr = wallet.account.address;
            const nonce = nonceMap.get(addr)!;
            nonceMap.set(addr, nonce + 1);

            // Prepare transaction (automatically uses wallet's chain for gas price estimation)
            // Note: No need to pass 'chain' - wallet already has it from createWalletClient
            const request = await wallet.prepareTransactionRequest({
                to: tx.address,
                data: encodeFunctionData({
                    abi: parsedAbi,
                    functionName: tx.functionName,
                    args: tx.args,
                }),
                value: tx.value,
                nonce,
                chain: undefined, // Uses wallet's chain
            });

            // Sign transaction
            const serialized = await wallet.signTransaction(request as any);

            return { wallet, serialized, addr };
        })
    );
}

/**
 * Batch send transactions with logging
 * Supports multiple wallets with automatic nonce management
 */
export async function batchSendTxWithLog(
    publicClient: PublicClient,
    walletClients: WalletClient[],
    kit: ChainKit,
    txs: TxRequest[]
): Promise<TransactionReceipt[]> {
    if (walletClients.length !== txs.length) {
        throw new Error(`Wallet count (${walletClients.length}) must match tx count (${txs.length})`);
    }

    console.log(`📦 Preparing ${txs.length} transactions...`);

    // Step 1: Prepare and sign all transactions
    const signedTxs = await prepareAndSignBatch(publicClient, walletClients, txs);

    console.log(`✅ All ${signedTxs.length} transactions signed`);
    console.log(`🚀 Broadcasting to network...`);

    // Step 2: Broadcast all signed transactions simultaneously
    const hashes = await Promise.all(
        signedTxs.map(async ({ wallet, serialized }, i) => {
            const hash = await wallet.sendRawTransaction({ serializedTransaction: serialized });
            console.log(`  ${i + 1}/${signedTxs.length} sent:`, hash);
            return hash;
        })
    );

    // Wait for all receipts
    console.log(`⏳ Waiting for ${hashes.length} confirmations...`);
    const receipts = await Promise.all(
        hashes.map((hash) => publicClient.waitForTransactionReceipt({ hash, confirmations: 1 }))
    );

    // Check for failures
    const failed = receipts.filter((r) => r.status === 'reverted');
    if (failed.length > 0) {
        throw new Error(`${failed.length}/${receipts.length} transactions reverted`);
    }

    console.log(`✅ All ${receipts.length} transactions confirmed!`);
    return receipts;
}

/**
 * Batch send transactions without logging (silent)
 * Supports multiple wallets with automatic nonce management
 */
export async function batchSendTxSilent(
    publicClient: PublicClient,
    walletClients: WalletClient[],
    txs: TxRequest[]
): Promise<TransactionReceipt[]> {
    if (walletClients.length !== txs.length) {
        throw new Error(`Wallet count (${walletClients.length}) must match tx count (${txs.length})`);
    }

    // Step 1: Prepare and sign all transactions
    const signedTxs = await prepareAndSignBatch(publicClient, walletClients, txs);

    // Step 2: Broadcast all signed transactions simultaneously
    const hashes = await Promise.all(
        signedTxs.map(({ wallet, serialized }) => wallet.sendRawTransaction({ serializedTransaction: serialized }))
    );

    // Wait for all receipts
    const receipts = await Promise.all(hashes.map((hash) => publicClient.waitForTransactionReceipt({ hash })));

    // Check for failures
    const failed = receipts.filter((r) => r.status === 'reverted');
    if (failed.length > 0) {
        throw new Error(`${failed.length}/${receipts.length} transactions reverted`);
    }

    return receipts;
}
