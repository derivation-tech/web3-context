import { BigNumber, ethers } from 'ethers';
import { TxType } from '../types';
import { EthGasEstimator } from './estimator';
import asyncRetry from 'async-retry';
import { Provider } from '@ethersproject/abstract-provider';
import { JsonRpcProvider } from '@ethersproject/providers';
import { CHAIN_ID } from '@derivation-tech/context';

export class LineaGasEstimator implements EthGasEstimator {
    // Linea is compatible with EIP-1559; however, there are minor differences: https://docs.linea.build/build-on-linea/gas-fees
    // 1. The base fee on Linea is fixed at 7 wei to ensure that blocks aren't over 50% full, so that we don't burn any ETH on Linea.
    // 2. We don't mine a transaction if gasPrice or maxPriorityFeePerGas is lower than a given value that fluctuates over time.
    // To ensure that your transaction gets included by the sequencer, we recommend that non-MetaMask users use EIP-1559 with the following settings:
    // 1. maxBaseFee = 1.35 * previousBlockMaxBaseFee (equivalent to the medium ("Market") setting on MetaMask)
    // 2. maxPriorityFeePerGas = reward value from eth_feeHistory( 5 blocks, latest, 20th percentile)
    public async getGasPrice(
        chainId: CHAIN_ID,
        provider: Provider,
        txType: TxType,
        scaler = 1,
    ): Promise<ethers.Overrides> {
        const { reward, baseFeePerGas } = await asyncRetry(async () =>
            (provider as JsonRpcProvider).send('eth_feeHistory', [5, 'latest', [20]]),
        );

        // reward value from eth_feeHistory( 5 blocks, latest, 20th percentile)
        let maxPriorityFeePerGas = parseFloat(
            reward
                .reduce((acc: BigNumber, currentValue: string[]) => acc.add(currentValue[0]), BigNumber.from(0))
                .div(reward.length),
        );

        const baseFee = parseFloat(BigNumber.from(baseFeePerGas[baseFeePerGas.length - 1]).toString());
        const maxFeePerGas = (baseFee + maxPriorityFeePerGas) * scaler;

        maxPriorityFeePerGas = maxFeePerGas - baseFee;

        return {
            maxFeePerGas: Number(maxFeePerGas.toFixed(0)),
            maxPriorityFeePerGas: Number(maxPriorityFeePerGas.toFixed(0)),
        };
    }
}
