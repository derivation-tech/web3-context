import { LogLevel, BaseLogger } from '@derivation-tech/context';

import { EthGasEstimator } from './gasEstimator/estimator';
import { ErrorDescription } from '@ethersproject/abi/lib/interface';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { CallOverrides, Signer, Transaction } from 'ethers';

export enum TxType {
    LEGACY = 'legacy',
    EIP1559 = 'eip1559',
}

export interface ContractCallError {
    raw: any;
    code: string;
    msg: string;
    // apply for custome error
    description?: ErrorDescription;
    receipt?: TransactionReceipt;
    transaction?: Transaction;
    response?: TransactionResponse; // in case revert in waitForTransaction, we can return response
    transactionHash?: string;
}

export interface GasOptions {
    gasLimitMultiple?: number;
    gasPriceMultiple?: number;
    enableGasPrice?: boolean;
    disableGasLimit?: boolean;
}

export interface TxOptions extends CallOverrides, GasOptions {
    signer?: Signer;
}

export type TxOptionsWithSigner = Omit<TxOptions, 'signer'> & {
    signer: Signer;
};

export interface CallOption extends GasOptions {
    // tx.wait or not
    waitReceipt?: boolean;
    // wait timeout in seconds
    waitTimeout?: number;
    // estimate gas or not
    estimateGas?: boolean;
    // gas estimator is used for estimating gas price
    gasEstimator?: EthGasEstimator;
    loggerOps?: {
        level?: LogLevel;
        logger?: BaseLogger;
    };
}
