import { GasPriceOracle } from 'gas-price-oracle/lib/services';
import asyncRetry from 'async-retry';
import { ethers } from 'ethers';
import { TxType } from '../types';
import { EthGasEstimator } from './estimator';
import { Provider } from '@ethersproject/abstract-provider';
import { JsonRpcProvider } from '@ethersproject/providers';
import { CHAIN_ID } from '@derivation-tech/context';

export class DefaultEthGasEstimator implements EthGasEstimator {
    // we use gas-price-oracle as the default on-chain gas price estimator as ethers.js v5.7 does not support EIP1559 well (or not accuracte)
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
        // estimate gas price from gas-price-oracle with tx type
        const data = await asyncRetry(async () => {
            return gasPriceOracle.gasPrices({ isLegacy: txType === TxType.LEGACY });
        });
        // it is a EIP1559 tx
        if (data['maxFeePerGas'] && data['maxPriorityFeePerGas']) {
            const maxFeePerGas = data['maxFeePerGas'] * scaler;
            const maxPriorityFeePerGas = maxFeePerGas - data['baseFee'];
            return {
                maxPriorityFeePerGas: Math.ceil(maxPriorityFeePerGas * 10 ** 9),
                maxFeePerGas: Math.ceil(maxFeePerGas * 10 ** 9),
            };
        } else {
            return { gasPrice: Math.ceil(data['fast'] * scaler * 10 ** 9) };
        }
    }
}
