import type {
    Address,
    Abi,
    ContractFunctionName,
    ContractFunctionArgs,
    ContractEventName,
    ContractEventArgs,
    ContractErrorName,
    ContractErrorArgs,
} from 'viem';

// ==========================================
// CORE TYPES
// ==========================================

export interface Erc20TokenInfo {
    symbol: string;
    name: string;
    address: Address;
    decimals: number;
}

// ==========================================
// CONTRACT PARSER TYPES
// ==========================================

export interface ContractParser<TAbi extends Abi = Abi> {
    abi: string[]; // Human-readable ABI strings for event/error decoding

    // Optional custom formatters with proper viem types
    parseTransaction?: <TFunctionName extends ContractFunctionName<TAbi> = ContractFunctionName<TAbi>>(tx: {
        functionName: TFunctionName;
        args: ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>;
    }) => Promise<string>;

    parseEvent?: <TEventName extends ContractEventName<TAbi> = ContractEventName<TAbi>>(event: {
        eventName: TEventName;
        args: ContractEventArgs<TAbi, TEventName>;
    }) => Promise<string>;

    parseError?: <TErrorName extends ContractErrorName<TAbi> = ContractErrorName<TAbi>>(error: {
        name?: TErrorName;
        args?: ContractErrorArgs<TAbi, TErrorName>;
        signature?: string;
    }) => Promise<string>;
}
