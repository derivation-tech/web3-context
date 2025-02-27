import { LogLevel } from '@derivation-tech/context';
import { CallOption } from './types';

export const DEFAULT_CALL_OPTION: CallOption = {
    waitReceipt: true,
    waitTimeout: 3 * 60,
    estimateGas: true,
    gasLimitMultiple: 1.5,
    gasPriceMultiple: 1.2,
    loggerOps: {
        level: LogLevel.Info,
    },
};
