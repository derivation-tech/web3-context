import { CHAIN_ID } from '@derivation-tech/context';
import { EthGasEstimator } from './estimator';
import { DefaultEthGasEstimator } from './default';
import { LineaGasEstimator } from './linea';
import { OpStackGasEstimator } from './opStack';

export class EthGasEstimatorFactory {
    static getGasEstimator(chainId: CHAIN_ID): EthGasEstimator {
        switch (chainId) {
            case CHAIN_ID.LINEA:
                return new LineaGasEstimator();
            case CHAIN_ID.OPTIMISM:
            case CHAIN_ID.BASE:
            case CHAIN_ID.MANTLE:
                return new OpStackGasEstimator();
            default:
                return new DefaultEthGasEstimator();
        }
    }
}
