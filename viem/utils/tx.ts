import type { PublicClient, WalletClient, Address, TransactionReceipt, Account } from 'viem';
import { decodeEventLog, encodeFunctionData } from 'viem';
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
    try { (logger as any).setTimestamp?.(true); } catch {}
    const account = (walletClient.account as Account) || undefined;

    const parser = kit.getParser(req.address as Address);
    let txDesc: string | undefined;
    try {
        if (parser && (parser as any).parseTransaction) {
            const desc = await (parser as any).parseTransaction({
                functionName: req.functionName,
                args: req.args || [],
            });
            if (desc) txDesc = String(desc);
        }
    } catch {}

    let hash: `0x${string}`;
    try {
        hash = await walletClient.writeContract({
            account,
            chain: kit.chain,
            address: req.address,
            abi: req.abi as Abi,
            functionName: req.functionName as any,
            args: (req.args || []) as any,
            value: req.value,
        });
    } catch (err: any) {
        try {
            if (parser && (parser as any).parseError) {
                const parsed = await (parser as any).parseError(err);
                if (parsed) logger.info(`❌ ${parsed}`);
            }
        } catch {}
        throw err;
    }
    logger.info(`📤 Sent tx: ${hash}${txDesc ? ` ${txDesc}` : ''}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    try {
        for (let idx = 0; idx < (receipt.logs?.length || 0); idx++) {
            const log = receipt.logs![idx] as any;
            const p = kit.getParser(log.address as Address);
            if (!p) continue;
            if (p.parseEvent && (p as any).abi && log.topics && log.data !== undefined) {
                try {
                    const decoded = decodeEventLog({
                        abi: ((p as any).abi as unknown) as Abi,
                        data: log.data as `0x${string}`,
                        topics: (log.topics?.slice() as unknown as [`0x${string}`, ...`0x${string}`[]]) || [],
                        strict: false,
                    });
                    const parsed = await (p as any).parseEvent({
                        eventName: decoded.eventName,
                        args: decoded.args,
                    } as any);
                    if (parsed) {
                        const logIndex = (log.logIndex ?? idx) as number;
                        logger.info(`✅ Mint tx: ${hash} ${receipt.blockNumber} ${logIndex} ${parsed}`);
                    }
                } catch {}
            }
        }
    } catch {}
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
        chain: undefined,
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
    try { (logger as any).setTimestamp?.(true); } catch {}
    if (walletClients.length !== txs.length) {
        throw new Error('walletClients length must equal txs length');
    }

    const groups = new Map<string, { client: WalletClient; items: Array<{ index: number; req: TxRequest; desc?: string }> }>();
    for (let i = 0; i < txs.length; i++) {
        const req = txs[i];
        const client = walletClients[i];
        const addr = (client.account as Account).address;
        const parser = kit.getParser(req.address as Address);
        let desc: string | undefined;
        try {
            if (parser && (parser as any).parseTransaction) {
                const d = await (parser as any).parseTransaction({ functionName: req.functionName, args: req.args || [] });
                if (d) desc = String(d);
            }
        } catch {}
        const bucket = groups.get(addr) || { client, items: [] };
        bucket.items.push({ index: i, req, desc });
        groups.set(addr, bucket);
    }

    const groupList = Array.from(groups.values());
    const baseNonces = await Promise.all(
        groupList.map((g) => publicClient.getTransactionCount({ address: (g.client.account as Account).address as Address }))
    );

    const signedByIndex: Array<{ index: number; raw: string; desc?: string }> = [];
    for (let gi = 0; gi < groupList.length; gi++) {
        const g = groupList[gi];
        const startNonce = BigInt(baseNonces[gi]);
        const preparedSigned = await Promise.all(
            g.items.map(async (item, localIdx) => {
                const data = encodeFunctionData({
                    abi: item.req.abi as Abi,
                    functionName: item.req.functionName as any,
                    args: (item.req.args || []) as any,
                });
                const prepared = await g.client.prepareTransactionRequest({
                    account: g.client.account as Account,
                    chain: kit.chain,
                    to: item.req.address,
                    data,
                    value: item.req.value,
                    nonce: startNonce + BigInt(localIdx),
                } as any);
                const raw = await g.client.signTransaction(prepared as any);
                return { index: item.index, raw, desc: item.desc };
            })
        );
        signedByIndex.push(...preparedSigned);
    }

    const hashesByIndex: Array<`0x${string}`> = new Array(txs.length) as any;
    await Promise.all(
        signedByIndex.map(async (s) => {
            const h = await publicClient.sendRawTransaction({ serializedTransaction: s.raw as `0x${string}` });
            hashesByIndex[s.index] = h;
            logger.info(`📤 Sent tx: ${h}${s.desc ? ` ${s.desc}` : ''}`);
        })
    );

    const receipts = await Promise.all(hashesByIndex.map((hash) => publicClient.waitForTransactionReceipt({ hash })));

    for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i] as any;
        const txHash = hashesByIndex[i];
        try {
            for (let idx = 0; idx < (receipt.logs?.length || 0); idx++) {
                const log = receipt.logs[idx] as any;
                const p = kit.getParser(log.address as Address);
                if (!p) continue;
                if (p.parseEvent && (p as any).abi && log.topics && log.data !== undefined) {
                    try {
                        const decoded = decodeEventLog({
                            abi: ((p as any).abi as unknown) as Abi,
                            data: log.data as `0x${string}`,
                            topics: (log.topics?.slice() as unknown as [`0x${string}`, ...`0x${string}`[]]) || [],
                            strict: false,
                        });
                        const parsed = await (p as any).parseEvent({
                            eventName: decoded.eventName,
                            args: decoded.args,
                        } as any);
                        if (parsed) {
                            const logIndex = (log.logIndex ?? idx) as number;
                            logger.info(`  ✅ Mint tx: ${txHash} ${receipt.blockNumber} ${logIndex} ${parsed}`);
                        }
                    } catch {}
                }
            }
        } catch {}
    }
    return receipts as TransactionReceipt[];
}

export async function batchSendTxSilent(
    publicClient: PublicClient,
    walletClients: WalletClient[],
    txs: TxRequest[]
): Promise<TransactionReceipt[]> {
    if (walletClients.length !== txs.length) {
        throw new Error('walletClients length must equal txs length');
    }

    const groups = new Map<string, { client: WalletClient; items: Array<{ index: number; req: TxRequest }> }>();
    for (let i = 0; i < txs.length; i++) {
        const req = txs[i];
        const client = walletClients[i];
        const addr = (client.account as Account).address;
        const bucket = groups.get(addr) || { client, items: [] };
        bucket.items.push({ index: i, req });
        groups.set(addr, bucket);
    }

    const groupList = Array.from(groups.values());
    const baseNonces = await Promise.all(
        groupList.map((g) => publicClient.getTransactionCount({ address: (g.client.account as Account).address as Address }))
    );

    const signedByIndex: Array<{ index: number; raw: string }> = [];
    for (let gi = 0; gi < groupList.length; gi++) {
        const g = groupList[gi];
        const startNonce = BigInt(baseNonces[gi]);
        const preparedSigned = await Promise.all(
            g.items.map(async (item, localIdx) => {
                const data = encodeFunctionData({
                    abi: item.req.abi as Abi,
                    functionName: item.req.functionName as any,
                    args: (item.req.args || []) as any,
                });
                const prepared = await g.client.prepareTransactionRequest({
                    account: g.client.account as Account,
                    chain: undefined,
                    to: item.req.address,
                    data,
                    value: item.req.value,
                    nonce: startNonce + BigInt(localIdx),
                } as any);
                const raw = await g.client.signTransaction(prepared as any);
                return { index: item.index, raw };
            })
        );
        signedByIndex.push(...preparedSigned);
    }

    const hashesByIndex: Array<`0x${string}`> = new Array(txs.length) as any;
    await Promise.all(
        signedByIndex.map(async (s) => {
            const h = await publicClient.sendRawTransaction({ serializedTransaction: s.raw as `0x${string}` });
            hashesByIndex[s.index] = h;
        })
    );

    const receipts = await Promise.all(hashesByIndex.map((hash) => publicClient.waitForTransactionReceipt({ hash })));
    return receipts as TransactionReceipt[];
}


