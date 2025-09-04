import { BigNumber } from 'ethers';

export enum CHAIN_ID {
    LOCAL = 31337,
    ETHEREUM = 1,
    ROPSTEN = 3,
    RINKEBY = 4,
    GOERLI = 5,
    KOVAN = 42,
    BSC = 56,
    POLYGON = 137,
    POLYGONZKEVM = 1101,
    ARBITRUM = 42161,
    MUMBAI = 80001,
    ZKSYNC = 324,
    LINEA = 59144,
    OPTIMISM = 10,
    SCROLL = 534352,
    MANTLE = 5000,
    BASE = 8453,
    CONFLUX = 1030,
    MAPO = 22776,
    SEPOLIA = 11155111,
    KLAYTN = 8217,
    BERABARTIO = 80084,
    BLASTSEPOLIA = 168587773,
    BLAST = 81457,
    MANTA = 169,
    MONADTESTNET = 10143,
    GNOSIS = 100,
    AVALANCHE = 43114,
    BASESEPOLIA = 84532,
    GELATO = 123420001840,
    CONDUIT = 19908,
    ALTLAYER = 112245,
    ABC = 20250903
}

export const PREFIX = '├─';
export const PREFIX_SUB = '├───';
export const RIGHT_ARROW = '=>';

export const TOKEN_BATCH_SIZE = 50;
export const ADDR_BATCH_SIZE = 200;

export const HYPHEN = '-';
export const COMMA = ',';
export const SEMICOLON = ';';
export const COLON = ':';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const MINS_PER_HOUR = 60;
export const MINS_PER_DAY = 24 * 60;
export const MINS_PER_WEEK = 7 * 24 * 60;

export const SECS_PER_MINUTE = 60;
export const SECS_PER_HOUR = 60 * 60;
export const SECS_PER_DAY = 24 * 60 * 60;
export const SECS_PER_WEEK = 7 * 24 * 60 * 60;

export const WAD = BigNumber.from(String(10 ** 18));
export const ZERO = BigNumber.from(0);
export const ONE = BigNumber.from(1);
export const TWO = BigNumber.from(2);

export const MAX_UINT256 = BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

export const ONE_HUNDRED = BigNumber.from(100);
export const ONE_THOUSAND = BigNumber.from(1000);
export const TEN_THOUSAND = BigNumber.from(10000);
