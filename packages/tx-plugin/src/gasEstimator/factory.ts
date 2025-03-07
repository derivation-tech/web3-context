import { CHAIN_ID } from '@derivation-tech/context';
import { EthGasEstimator } from './estimator';
import { DefaultEthGasEstimator } from './default';
import { LineaGasEstimator } from './linea';

export class EthGasEstimatorFactory {
    static getGasEstimator(chainId: CHAIN_ID): EthGasEstimator {
        switch (chainId) {
            case CHAIN_ID.LINEA:
                return new LineaGasEstimator();
            default:
                return new DefaultEthGasEstimator();
        }
    }
}
