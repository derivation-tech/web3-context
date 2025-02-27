import BN from 'bignumber.js';
import { BigNumber, BigNumberish, utils } from 'ethers';

const CURRENCY_UNITS: ('K' | 'M' | 'B' | 'T')[] = ['K', 'M', 'B', 'T'];
const CURRENCY_UNIT_NUM = 10 ** 3; // 1000

/**
 * number display format
 * @param param0
 * @returns
 */
export function formatDisplayNumber({
    num,
    isShowSeparator = true,
    type = 'normal',
    isOperateNum = false,
    isShowTBMK = false,
    isShowApproximatelyEqualTo = true,
    showPositive,
    roundingMode = BN.ROUND_DOWN,
}: {
    num: BigNumberish | BN;
    isShowSeparator?: boolean;
    type?: 'price' | 'normal';
    isOperateNum?: boolean;
    isShowTBMK?: boolean;
    showPositive?: boolean;
    isShowApproximatelyEqualTo?: boolean;
    roundingMode?: BN.RoundingMode;
}): string {
    let numBN = toBN(num);
    if (numBN.isNaN() || numBN.eq(Infinity)) {
        numBN = toBN(0);
    }
    let sign = '';
    if (numBN.isNegative()) {
        sign = '-';
        numBN = numBN.abs();
    } else if (showPositive) {
        sign = '+';
    }
    let numStr = numBN.toString(10);
    if (isOperateNum) {
        if (numBN.gte(1)) {
            numStr = numBN.toFixed(4, roundingMode);
        } else {
            numStr = numBN.toPrecision(4, roundingMode);
        }
    } else {
        // >=1000 use TBMK unit
        if (numBN.eq(0)) {
            numStr = numBN.toFixed(4, roundingMode);
        } else if (numBN.gte(10000)) {
            const numRes = numBN.integerValue(roundingMode);
            numStr = numRes.toString();
            if (isShowTBMK) {
                const numRes = getBigCurrencyNum(numBN, 'K', roundingMode);
                numStr = numRes.numStr;
            }
        } else if (numBN.gte(1000) && numBN.lt(10000)) {
            if (type === 'price') {
                numBN = numBN.precision(5, roundingMode);
                numStr = numBN.toPrecision(5, roundingMode);
            } else {
                const numRes = numBN.precision(5, roundingMode);
                numStr = numRes.toPrecision(5, roundingMode);
                if (isShowTBMK) {
                    const numRes = getBigCurrencyNum(numBN, 'K', roundingMode);
                    numStr = numRes.numStr;
                }
            }
        } else if (numBN.gte(1) && numBN.lt(1000)) {
            numBN = numBN.precision(5, roundingMode);
            numStr = numBN.toPrecision(5, roundingMode);
        } else if (numBN.gte(0.0001) && numBN.lt(1)) {
            if (type === 'price') {
                numBN = numBN.precision(5, roundingMode);
                numStr = numBN.toPrecision(5, roundingMode);
            } else {
                numStr = numBN.toFixed(4, roundingMode);
            }
        } else {
            if (type === 'price') {
                numBN = numBN.precision(4, roundingMode);
                const decimalPlaces = numBN.decimalPlaces() || 0;
                if (decimalPlaces > 8) {
                    numStr = numBN.toFixed(8, roundingMode);
                } else {
                    numStr = numBN.toPrecision(4, roundingMode);
                }
            } else {
                // show `<0.0001` when 0< num < 0.0001
                if (sign !== '-') {
                    return `<0.0001`;
                }
                return `${isShowApproximatelyEqualTo ? '≈' : ''}0.0000`;
            }
        }
    }

    if (isShowSeparator) {
        numStr = toCurrencyNumber(numStr);
    }
    return `${sign}${numStr}`;
}

// the util function to make a bignumber, should be used whenever making a big number is need.
export function toBN(value: BigNumberish | BN, unit: 'normal' | 'ether' = 'normal'): BN {
    let number = value;
    if (unit === 'ether' && BigNumber.isBigNumber(value)) {
        number = utils.formatEther(value);
    }
    if (typeof number === 'undefined') {
        number = 0;
    }
    return new BN(number.toString(10), 10);
}

/**
 * to show currency number with comma
 */
const toCurrencyNumber = (x: number | string): string => {
    const parts = x.toString().split('.');
    if (parts.length > 0) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }
    return '';
};

function getBigCurrencyNum(
    numBN: BN,
    unit: 'K' | 'M' | 'B' | 'T',
    roundingMode?: BN.RoundingMode,
): { numBN: BN; numStr: string } {
    if (!roundingMode) roundingMode = BN.ROUND_DOWN;
    const i = CURRENCY_UNITS.findIndex((u) => u === unit);
    let numStr = numBN.toString(10);
    numBN = numBN.div(CURRENCY_UNIT_NUM);
    // get the biggest unit
    if (numBN.gte(CURRENCY_UNIT_NUM) && unit !== 'T') {
        return getBigCurrencyNum(numBN, CURRENCY_UNITS[i + 1]);
    }
    if (unit === 'T' && numBN.gte(CURRENCY_UNIT_NUM)) {
        numBN = numBN.integerValue(roundingMode);
    } else {
        numBN = numBN.precision(4, roundingMode);
    }
    numStr = `${numBN.toPrecision(4, roundingMode)}${CURRENCY_UNITS[i]}`;

    return {
        numBN,
        numStr,
    };
}

// console.info(formatDisplayNumber({ num: 12366.8891121312, isShowTBMK: true }));
