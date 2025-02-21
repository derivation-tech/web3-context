import { GasPriceOracle } from 'gas-price-oracle/lib/services';
import asyncRetry from 'async-retry';
import { ethers } from 'ethers';
import { TxType } from '../types';
import { EthGasEstimator } from './estimator';
import { Provider } from '@ethersproject/abstract-provider';
import { JsonRpcProvider } from '@ethersproject/providers';
import { CHAIN_ID } from '@derivation-tech/context';

// apply for OP, BASE and MANTLE
export class OpStackGasEstimator implements EthGasEstimator {
    public async getGasPrice(
        chainId: CHAIN_ID,
        provider: Provider,
        txType: TxType,
        scaler = 1,
    ): Promise<ethers.Overrides> {
        const gasPriceOracle = new GasPriceOracle({
            defaultRpc: (provider as JsonRpcProvider).connection.url,
            chainId,
        });
        // use legacy mode if using op stack since it's rpc acts wired
        const data = await asyncRetry(async () => {
            return gasPriceOracle.legacy.gasPrices();
        });
        return { gasPrice: Math.ceil(data['fast'] * scaler * 10 ** 9) };
    }
}
