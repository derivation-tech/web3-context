import { Signer } from 'ethers';
import { Provider } from '@ethersproject/providers';
import type { LedgerSigner as LedgerSignerConstructor } from '@derivation-tech/ethers-ledger';
import { LEDGER } from './constants';
import { SignerModule } from './signer.module';
import { Context } from '@derivation-tech/context';

export class LedgerSignerModule extends SignerModule {
	static cachedLedgerSigners: Map<string, Signer>;

	constructor(ctx: Context, provider?: Provider) {
		super(ctx, provider);
	}

	getWallet(name: string): Signer {
		const ledgerIndex = LEDGER + '_INDEX';
		if (process.env[ledgerIndex]) {
			return this.getHdWallet(name, parseInt(process.env[ledgerIndex] as string));
		}
		const ledgerPath = LEDGER + '_PATH';
		if (process.env[ledgerPath]) {
			return this.getHdWallet(name, process.env[ledgerPath]);
		}
		// just return wallet 0
		return this.getHdWallet(name, 0);
	}

	getHdWallet(name: string, hdPathOrIndex: string | number): Signer {
		if (!name.toUpperCase().includes(LEDGER)) {
			throw Error('Not implemented hardwareWallet: ' + name);
		}
		if (typeof hdPathOrIndex === 'number') {
			const path = `m/44'/60'/${hdPathOrIndex}'/0/0`;
			return this.getLedgerWallet(path);
		} else {
			return this.getLedgerWallet(hdPathOrIndex);
		}
	}

	getLedgerWallet(customPath: string): Signer {
		let signer = this.fromCache(customPath);
		if (!signer) {
			const {
				LedgerSigner,
			}: {
				LedgerSigner: typeof LedgerSignerConstructor;
			} = require('@derivation-tech/ethers-ledger');
			signer = new LedgerSigner(this.provider, customPath, {
				nft: false,
				externalPlugins: false,
				erc20: false,
			}) as Signer;
			LedgerSignerModule.cachedLedgerSigners.set(customPath, signer);
		}
		return signer;
	}

	private fromCache(path: string): Signer {
		if (!LedgerSignerModule.cachedLedgerSigners) LedgerSignerModule.cachedLedgerSigners = new Map();
		return LedgerSignerModule.cachedLedgerSigners.get(path)!;
	}
}
