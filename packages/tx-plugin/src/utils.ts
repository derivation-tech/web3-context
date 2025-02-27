import { CallOverrides } from 'ethers';
import { TxOptions } from './types';

export function toPopulatedTxOverrides(txOptions?: TxOptions): CallOverrides {
    if (!txOptions) {
        return {};
    }

    const _txOptions = {
        ...txOptions,
    };

    if (_txOptions.signer) {
        if (_txOptions.from === undefined) {
            _txOptions.from = _txOptions.signer.getAddress();
        }

        delete _txOptions['signer'];
    }

    if (_txOptions.blockTag) {
        delete _txOptions['blockTag'];
    }

    if (_txOptions.enableGasPrice) {
        delete _txOptions['enableGasPrice'];
    }

    if (_txOptions.disableGasLimit) {
        delete _txOptions['disableGasLimit'];
    }

    if (_txOptions.gasLimitMultiple) {
        delete _txOptions['gasLimitMultiple'];
    }

    if (_txOptions.gasPriceMultiple) {
        delete _txOptions['gasPriceMultiple'];
    }

    return _txOptions;
}
