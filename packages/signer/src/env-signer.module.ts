import { CHAIN_ID } from '@derivation-tech/context';
import { ethers } from 'ethers';
import { isSameAddress } from '@derivation-tech/context';
import { SignerModule } from './signer.module';
import { Provider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { Context } from '@derivation-tech/context';

export class EnvSignerModule extends SignerModule {
    constructor(ctx: Context, provider?: Provider) {
        super(ctx, provider);
    }

    getWallet(name: string): Wallet {
        const privateKeyName = name.toUpperCase() + '_PRIVATE_KEY';
        if (!process.env[privateKeyName]) {
            throw Error(`No private key found for ${name}`);
        }

        const wallet = new Wallet(process.env[privateKeyName] as string, this.provider);

        const expectedAddress = name.toUpperCase() + '_ADDRESS';
        if (process.env[expectedAddress]) {
            if (!isSameAddress(wallet.address, process.env[expectedAddress] as string)) {
                throw Error(`Address mismatch for ${name}`);
            }
        }

        return wallet;
    }

    getHdWallet(name: string, hdPathOrIndex: string | number): Wallet {
        const mnemonic = process.env[name.toUpperCase() + '_MNEMONIC'];
        if (!mnemonic) {
            throw Error(`No mnemonic found for ${name}`);
        }
        if (typeof hdPathOrIndex === 'string') {
            return Wallet.fromMnemonic(mnemonic, hdPathOrIndex).connect(this.provider);
        } else {
            const index = hdPathOrIndex as number;
            const defaultPath = ethers.utils.defaultPath.slice(0, -1) + index.toString();

            const chainNameUpperCase: string = CHAIN_ID[this.chainId];
            const pathName = name.toUpperCase() + '_' + chainNameUpperCase + '_HD_PATH';
            const path = pathName in process.env ? process.env[pathName] + '/' + index.toString() : defaultPath;
            return ethers.Wallet.fromMnemonic(mnemonic, path).connect(this.provider);
        }
    }
}
