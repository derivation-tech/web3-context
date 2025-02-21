import { TxType } from '../types';
import { ethers } from 'ethers';
import { Provider } from '@ethersproject/abstract-provider';
import { CHAIN_ID } from '@derivation-tech/context';

export interface EthGasEstimator {
    getGasPrice(chainId: CHAIN_ID, provider: Provider, txType: TxType, scaler?: number): Promise<ethers.Overrides>;
}
