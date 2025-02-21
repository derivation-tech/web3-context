import { ethers } from 'ethers';

import * as dotenv from 'dotenv';
import { LEDGER } from './constants';
import { SignerType } from './types';
import { envSignerPlugin, ledgerSignerPlugin } from './signer.plugin';

if (typeof window !== 'object' && typeof self !== 'object') {
	dotenv.config();
}

export function isSameAddress(addr1: string, addr2: string): boolean {
	if (ethers.utils.isAddress(addr1) === false || ethers.utils.isAddress(addr2) === false)
		return false;
	return addr1.toLocaleLowerCase() === addr2.toLocaleLowerCase();
}

export function isZeroAddress(addr: string): boolean {
	return isSameAddress(addr, ethers.constants.AddressZero);
}

export function getSignerPlugin(signerId: string) {
	const type = signerId.toUpperCase().startsWith(LEDGER) ? SignerType.LEDGER : SignerType.ENV;

	switch (type) {
		case SignerType.LEDGER:
			return ledgerSignerPlugin();
		case SignerType.ENV:
			return envSignerPlugin();
		default:
			throw new Error(`Unsupported signer type: ${type}`);
	}
}
