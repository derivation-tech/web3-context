import { Context, Plugin } from '@derivation-tech/context';
import { EnvSignerModule } from './env-signer.module';
import { LedgerSignerModule } from './ledger-signer.module';
import { SignerInterface } from './signer.interface';

declare module '@derivation-tech/context' {
    interface Context {
        signer: SignerInterface;
    }
}

export const envSignerPlugin = (): Plugin => {
    return {
        install(context: Context): void {
            context.signer = new EnvSignerModule(context);
        },
    };
};

export const ledgerSignerPlugin = (): Plugin => {
    return {
        install(context: Context): void {
            context.signer = new LedgerSignerModule(context);
        },
    };
};
