import { Wallet, Signer, ethers } from 'ethers';
import { SignerInterface } from './signer.interface';
import { WALLET_DELIMITER } from './constants';
import { Provider } from '@ethersproject/providers';
import { CHAIN_ID, Context } from '@derivation-tech/context';

export abstract class SignerModule implements SignerInterface {
	provider: Provider;
	chainId: CHAIN_ID;
	ctx: Context;

	constructor(ctx: Context, provider?: Provider) {
		this.ctx = ctx;
		this.chainId = ctx.chainId;
		this.provider = provider ?? this.ctx.provider;
	}

	getWallet(name: string): Wallet | Signer {
		throw new Error('Method not implemented.');
	}
	getHdWallet(name: string, hdPathOrIndex: string | number): Wallet | Signer {
		throw new Error('Method not implemented.');
	}

	// two ways to obtain a signer:
	// 1. from mnemonic phrase of a hd wallet with a string, eg: "hdwallet:0", "hdwallet:1", "ledger:m/44'/60'/0'/0/0"
	// 2. from private key
	// note: 'ledger' is a key word, it is specifically used for Ledger wallet,
	// that is, you can not use a hd wallet with name "ledger" from env.
	// eg:
	// 1. getSigner("alice:1")
	// 2. getSigner("alice:m/44'/60'/0'/0/12")
	// 3. getSigner("bob")
	// 4. getSigner("ledger:1")
	// 5. getSigner("ledger:m/44'/60'/0'/0/12")
	public async getSigner(signerId: string): Promise<Signer> {
		// hd wallet with name and hdPathOrIndex string, eg: "hdwallet:0", "ledger:1", "ledger:m/44'/60'/0'/0/0"
		if (signerId.split(WALLET_DELIMITER).length === 2) {
			const items = signerId.split(WALLET_DELIMITER);
			const hdPathOrIndex = isNaN(Number(items[1])) ? items[1] : Number(items[1]);

			const wallet = this.getHdWallet(items[0], hdPathOrIndex);
			this.ctx.registerAddress(await wallet.getAddress(), signerId);
			return wallet;
		}

		// wallet from private key
		const wallet = this.getWallet(signerId);
		this.ctx.registerAddress(await wallet.getAddress(), signerId);
		return wallet;
	}

	// getAddress
	// 1. by address: (address) => address
	// 2. by signer id: (alice:0) => address
	// 3. by name:
	//    (usdc) => address
	//    (Router) => address
	//    (ranger:99) => address
	public async getAddress(source: string): Promise<string> {
		if (ethers.utils.isAddress(source)) {
			return source;
		}

		// look up address book
		if (this.ctx.nameToAddress.has(source.toLowerCase())) {
			return this.ctx.nameToAddress.get(source.toLowerCase())!;
		}

		// if it is a signer id
		const signer = await this.getSigner(source);
		return await signer.getAddress();
	}
}
