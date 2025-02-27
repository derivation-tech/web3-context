import { ethers } from 'ethers';
import { ContractCallError, TxOptions, TxType } from './types';

export interface TxInterface {
    sendTx(
        rawTx: ethers.PopulatedTransaction,
        txOptions?: TxOptions,
    ): Promise<ethers.providers.TransactionReceipt | ethers.PopulatedTransaction>;

    send2Txs(
        signers: ethers.Signer[],
        rawTxs: ethers.PopulatedTransaction[] | Promise<ethers.PopulatedTransaction>[],
    ): Promise<ethers.ContractTransaction[] | ethers.providers.TransactionReceipt[]>;

    batchSendTxs(
        signers: ethers.Signer[],
        rawTxs: ethers.PopulatedTransaction[] | Promise<ethers.PopulatedTransaction>[],
    ): Promise<ethers.ContractTransaction[] | ethers.providers.TransactionReceipt[]>;

    getGasPrice(txType?: TxType, scaler?: number): Promise<ethers.Overrides>;

    normalizeError(e: any): Promise<ContractCallError>;
}
