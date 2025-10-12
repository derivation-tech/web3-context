import type { PublicClient, WalletClient, Address, TransactionReceipt, Account } from 'viem';
import type { Abi } from 'viem';
import type { ChainKit } from '../chain-kit';
import { LoggerFactory } from './logger';

export type TxRequest = {
    address: Address;
    abi: Abi | readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
};

export async function sendTxWithLog(
    publicClient: PublicClient,
    walletClient: WalletClient,
    kit: ChainKit,
    req: TxRequest
): Promise<TransactionReceipt> {
    const logger = LoggerFactory.getLogger(`${kit.chain.name}::Tx`);
    const account = (walletClient.account as Account) || undefined;
    const hash = await walletClient.writeContract({
        account,
        chain: kit.chain,
        address: req.address,
        abi: req.abi as Abi,
        functionName: req.functionName as any,
        args: (req.args || []) as any,
        value: req.value,
    });
    logger.info(`📤 Sent tx: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    logger.info(`✅ Confirmed in block ${receipt.blockNumber}`);
    return receipt;
}

export async function sendTxSilent(
    publicClient: PublicClient,
    walletClient: WalletClient,
    req: TxRequest
): Promise<TransactionReceipt> {
    const account = (walletClient.account as Account) || undefined;
    const hash = await walletClient.writeContract({
        account,
        address: req.address,
        abi: req.abi as Abi,
        functionName: req.functionName as any,
        args: (req.args || []) as any,
        value: req.value,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt;
}

export async function batchSendTxWithLog(
    publicClient: PublicClient,
    walletClients: WalletClient[],
    kit: ChainKit,
    txs: TxRequest[]
): Promise<TransactionReceipt[]> {
    const logger = LoggerFactory.getLogger(`${kit.chain.name}::BatchTx`);
    const primary = walletClients[0];
    const hashes = await Promise.all(
        txs.map((req) =>
            primary.writeContract({
                account: (primary.account as Account) || undefined,
                chain: kit.chain,
                address: req.address,
                abi: req.abi as Abi,
                functionName: req.functionName as any,
                args: (req.args || []) as any,
                value: req.value,
            })
        )
    );
    hashes.forEach((h, i) => logger.info(`📤 Sent ${i + 1}/${hashes.length}: ${h}`));
    const receipts = await Promise.all(hashes.map((hash) => publicClient.waitForTransactionReceipt({ hash })));
    logger.info(`✅ All ${receipts.length} transactions confirmed`);
    return receipts;
}

export async function batchSendTxSilent(
    publicClient: PublicClient,
    walletClients: WalletClient[],
    txs: TxRequest[]
): Promise<TransactionReceipt[]> {
    const primary = walletClients[0];
    const hashes = await Promise.all(
        txs.map((req) =>
            primary.writeContract({
                account: (primary.account as Account) || undefined,
                address: req.address,
                abi: req.abi as Abi,
                functionName: req.functionName as any,
                args: (req.args || []) as any,
                value: req.value,
            })
        )
    );
    const receipts = await Promise.all(hashes.map((hash) => publicClient.waitForTransactionReceipt({ hash })));
    return receipts;
}


