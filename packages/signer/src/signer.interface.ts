import { Wallet, Signer } from 'ethers';

export interface SignerInterface {
	getWallet(name: string): Wallet | Signer;
	getHdWallet(name: string, hdPathOrIndex: string | number): Wallet | Signer;
	getSigner(signerId: string): Promise<Signer>;
	getAddress(source: string): Promise<string>;
}
