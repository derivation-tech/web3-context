import WebSocket from 'ws';
import { ethers } from 'ethers';
import { CHAIN_ID } from './constant';

export function getProvider(url: string, timeout = 20000): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider({
        url,
        timeout: timeout,
    });
}

export function getWssProvider(url: string): ethers.providers.WebSocketProvider {
    const ws = new WebSocket(url);
    return new ethers.providers.WebSocketProvider(ws);
}

export function getProviderHeaders(network: CHAIN_ID, type: 'RPC' | 'WSS'): Record<string, string> {
    const envAuthKey = CHAIN_ID[network] + '_' + type + '_AUTH';
    if (!process.env[envAuthKey]) {
        return {};
    }
    return {
        Authorization: 'Basic ' + Buffer.from(process.env[envAuthKey]).toString('base64'),
    };
}

export function isSameAddress(addr1: string, addr2: string): boolean {
    if (ethers.utils.isAddress(addr1) === false || ethers.utils.isAddress(addr2) === false) return false;
    return addr1.toLocaleLowerCase() === addr2.toLocaleLowerCase();
}

export function isZeroAddress(addr: string): boolean {
    return isSameAddress(addr, ethers.constants.AddressZero);
}
