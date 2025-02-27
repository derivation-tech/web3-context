import { Interface } from '@ethersproject/abi';
import { TransactionReceipt, Log } from '@ethersproject/abstract-provider';
import { LogDescription } from '@ethersproject/abi';

export interface TransactionEvent extends LogDescription {
    txHash: string;
    address: string;
    timestamp?: number;
    blockNumber?: number;
    logIndex: number;
}

export function extractEvents(
    receipt: TransactionReceipt,
    contractInterfaces: Interface[],
    eventNames?: string[],
): TransactionEvent[] {
    const res: TransactionEvent[] = [];
    receipt.logs.map((log: Log) => {
        for (const topic of log.topics) {
            for (const contractInterface of contractInterfaces) {
                if (!eventExists(topic, contractInterface)) {
                    continue;
                }
                const event = contractInterface.parseLog(log) as TransactionEvent;
                if (eventNames && eventNames.length > 0 && !eventNames.includes(event.name)) {
                    continue;
                }
                event.txHash = receipt.transactionHash;
                event.address = log.address;
                event.blockNumber = receipt.blockNumber;
                event.logIndex = log.logIndex;
                res.push(event);
            }
        }
    });
    return res;
}

export function eventExists(nameOrSignatureOrTopic: string, contractInterface: Interface): boolean {
    const topichash = nameOrSignatureOrTopic.toLowerCase();
    for (const name in contractInterface.events) {
        if (topichash === contractInterface.getEventTopic(name)) {
            return true;
        }
    }
    return false;
}
