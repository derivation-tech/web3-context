import { BigNumber, BigNumberish, ethers } from 'ethers';
import moment from 'moment';
import { utils } from 'ethers';
import { LoggerFactory } from '../logger';
import { ContextCoreError } from '../error';

const logger = LoggerFactory.getLogger('Common');

// to generate a random int between [0, max)
export function getRandomInt(max: number): number {
    return Math.floor(Math.random() * max);
}

export function wait(seconds: number) {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), seconds * 1000));
}

// current timestamp in seconds.
export function now(): number {
    return Math.floor(new Date().getTime() / 1000);
}

export function setValueIfUndefined(obj: any, key: string, value: any) {
    if (obj[key] === undefined) {
        obj[key] = value;
    }
}

export function currentTimestampMilSecs(): number {
    return Math.floor(new Date().getTime());
}

export function formatTs(timestamp?: number, utcOffSet = 8) {
    if (timestamp) {
        return moment(timestamp * 1000)
            .utcOffset(utcOffSet)
            .format('yyyy-MM-DD HH:mm:ss');
    } else {
        return moment().utcOffset(utcOffSet).format('yyyy-MM-DD HH:mm:ss');
    }
}

// console.info(formatTs());
export function chunk<T>(arr: Array<T>, batchSize: number) {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += batchSize) {
        result.push(arr.slice(i, i + batchSize));
    }
    return result;
}

export function transpose<T>(arr: Array<Array<T>>) {
    return arr[0].map((_, colIndex) => arr.map((row) => row[colIndex]));
}

// map a compact representation of identifiers to a corresponding identifier list
// support inputs like: alice:0-2,bob,david:m/44'/60'/0'/5/20-30,0xxxx
export function translateIdentifiers(input: string): string[] {
    return input
        .toLowerCase()
        .split(',')
        .map((str: string) => {
            if (ethers.utils.isAddress(str)) return [str];

            // just a name: alice => [alice]
            if (!str.includes(':')) return [str];

            // name with index range: alice or or alice:0 or alice:0-2 => [alice:0, alice:1, alice:2]
            // or alice:m/44'/60'/0'/5/0-2 => [alice:m/44'/60'/0'/5/0, alice:m/44'/60'/0'/5/1, alice:m/44'/60'/0'/5/2]
            if (str.split(':').length != 2) throw new ContextCoreError(`BAD_SIGNER_INPUT: ${str}`);

            const hdPathSpecified = str.includes('/');
            let name: string, range: string;
            // with hdPath specified: alice:m/44'/60'/0'/5/20-30
            if (hdPathSpecified)
                [name, range] = [
                    str.slice(0, str.lastIndexOf('/') + 1),
                    str.slice(str.lastIndexOf('/') + 1, str.length),
                ];
            else [name, range] = str.split(':');

            if (!range.includes('-')) return [str];

            if (range.split('-').length != 2) throw new ContextCoreError(`BAD_SIGNER_INPUT: ${str}`);
            const [begin, end] = range.split('-').map((r) => parseInt(r));
            if (!(begin < end)) throw new ContextCoreError(`BAD_SIGNER_INPUT: ${str}`);

            const indexes = Array.from(Array(end - begin + 1).keys()).map((i) => i + begin);
            return indexes.map((i) => (hdPathSpecified ? `${name}${i}` : `${name}:${i}`));
        })
        .flat();
}

export function roughlyEqual(x: BigNumber, y: BigNumber, ratio = 20) {
    const diff = x.sub(y).abs();
    const max = x.gt(y) ? x : y;
    return diff.lte(max.mul(ratio).div(100));
}

export function getRandomIntBetween(min: number, max: number) {
    return Math.floor(getRandomBetween(min, max));
}

export function getRandomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export function randomSort<T>(elements: T[]) {
    return elements.sort(() => Math.random() - 0.5);
}

export function fromWad(wad: BigNumberish): number {
    return Number(ethers.utils.formatEther(wad));
}

export function toWad(num: BigNumberish): BigNumber {
    return utils.parseUnits(num.toString());
}

export function formatWad(value: BigNumberish, fixedDecimals = 6): string {
    return shortenNumberByDecimals(ethers.utils.formatEther(value), fixedDecimals);
}

export function formatUnits(value: BigNumberish, decimals: number, fixedDecimals = 6): string {
    return shortenNumberByDecimals(ethers.utils.formatUnits(value, decimals), fixedDecimals);
}

// if the length of decimal part is less than fixedDecimals we return directly, else to fixed decimals
export function shortenNumberByDecimals(s: string, fixedDecimals: number): string {
    if (s.split('.').length > 1 && s.split('.')[1].length > fixedDecimals) {
        return Number(s).toFixed(fixedDecimals);
    } else {
        return s;
    }
}

export function formatPercentage(num: number, decimals = 2): string {
    return (num * 100).toFixed(decimals) + '%';
}

export const DEFAULT_RETRY_OPTION = {
    retries: 5,
    onRetry: (error: Error): void => {
        logger.error('retrying on error:', error);
    },
};
