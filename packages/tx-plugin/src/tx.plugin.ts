import { Context, Plugin } from '@derivation-tech/context';
import { TxModule } from './tx.module';
import { CallOption } from './types';
import { TxInterface } from './tx.interface';

declare module '@derivation-tech/context' {
    interface Context {
        tx: TxInterface;
    }
}

export const txPlugin = (option: CallOption): Plugin => {
    return {
        install(context: Context): void {
            context.tx = new TxModule(context, option);
        },
    };
};
