import { BigNumber, ethers } from 'ethers';
import { TxType } from '../types';
import { EthGasEstimator } from './estimator';
import { Provider } from '@ethersproject/abstract-provider';
import { JsonRpcProvider } from '@ethersproject/providers';
import { CHAIN_ID } from '@derivation-tech/context';

const defaultBlocks = 100;

export class DefaultEthGasEstimator implements EthGasEstimator {
    public async getGasPrice(
        chainId: CHAIN_ID,
        provider: Provider,
        txType: TxType,
        scaler = 1,
    ): Promise<ethers.Overrides> {
        if (txType === TxType.LEGACY) {
            // legacy transaction, use the current gas price
            const gasPrice = await provider.getGasPrice();
            return { gasPrice };
        } else {
            // query the historical information of the last 3% of fees in the last 100 blocks
            const result: {
                baseFeePerGas: string[];
                reward: [string][];
            } = await (provider as JsonRpcProvider).send('eth_feeHistory', [defaultBlocks, 'latest', [3]]);

            let maxBaseFeePerGas = BigNumber.from(0);
            let priorityFeePerGas = BigNumber.from(0);

            for (let i = 0; i < defaultBlocks; i++) {
                const baseFeePerGas = BigNumber.from(result.baseFeePerGas[i]);
                maxBaseFeePerGas = maxBaseFeePerGas.gt(baseFeePerGas) ? maxBaseFeePerGas : baseFeePerGas;
                priorityFeePerGas = priorityFeePerGas.add(BigNumber.from(result.reward[i][0]));
            }

            // calculate the average priorityFeePerGas and multiply by the scaler
            priorityFeePerGas = priorityFeePerGas
                .div(defaultBlocks)
                .mul(Math.floor(scaler * 100))
                .div(100);

            // zero check
            if (priorityFeePerGas.isZero()) {
                priorityFeePerGas = BigNumber.from(1);
            }

            return {
                // double baseFeePerGas to prevent baseFee from rising
                maxFeePerGas: maxBaseFeePerGas.mul(2).add(priorityFeePerGas),
                maxPriorityFeePerGas: priorityFeePerGas,
            };
        }
    }
}
