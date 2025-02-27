/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
    BaseContract,
    BigNumber,
    BigNumberish,
    BytesLike,
    CallOverrides,
    ContractTransaction,
    Overrides,
    PayableOverrides,
    PopulatedTransaction,
    Signer,
    utils,
} from 'ethers';
import type { FunctionFragment, Result, EventFragment } from '@ethersproject/abi';
import type { Listener, Provider } from '@ethersproject/providers';
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from './common';

export type BlockInfoStruct = { height: BigNumberish; timestamp: BigNumberish };

export type BlockInfoStructOutput = [BigNumber, BigNumber] & {
    height: BigNumber;
    timestamp: BigNumber;
};

export type Erc1155MetaInfoStruct = {
    tokenURI: string;
    tokenId: BigNumberish;
    token: string;
};

export type Erc1155MetaInfoStructOutput = [string, BigNumber, string] & {
    tokenURI: string;
    tokenId: BigNumber;
    token: string;
};

export type Erc721MetaInfoStruct = {
    symbol: string;
    name: string;
    tokenURI: string;
    tokenId: BigNumberish;
    token: string;
};

export type Erc721MetaInfoStructOutput = [string, string, string, BigNumber, string] & {
    symbol: string;
    name: string;
    tokenURI: string;
    tokenId: BigNumber;
    token: string;
};

export type TokenMetaInfoStruct = {
    symbol: string;
    name: string;
    decimals: BigNumberish;
    token: string;
};

export type TokenMetaInfoStructOutput = [string, string, number, string] & {
    symbol: string;
    name: string;
    decimals: number;
    token: string;
};

export interface TokenAssistantInterface extends utils.Interface {
    functions: {
        'balanceOfErc1155Batch(address,address[],uint256[])': FunctionFragment;
        'balanceOfErc721Batch(address[],address[])': FunctionFragment;
        'balanceOfTokenBatch(address[],address[])': FunctionFragment;
        'disperseErc1155(address,uint256[],address[],uint256[])': FunctionFragment;
        'disperseErc20(address,address[],uint256[])': FunctionFragment;
        'disperseErc721(address,uint256[],address[])': FunctionFragment;
        'disperseNative(address[],uint256[])': FunctionFragment;
        'initialize(address)': FunctionFragment;
        'metaOfErc1155Batch(address[],uint256[])': FunctionFragment;
        'metaOfErc721Batch(address[],uint256[])': FunctionFragment;
        'metaOfTokenBatch(address[])': FunctionFragment;
        'unwrapNativeToken(uint256,address)': FunctionFragment;
        'wrapNativeToken(uint256,address)': FunctionFragment;
    };

    getFunction(
        nameOrSignatureOrTopic:
            | 'balanceOfErc1155Batch'
            | 'balanceOfErc1155Batch(address,address[],uint256[])'
            | 'balanceOfErc721Batch'
            | 'balanceOfErc721Batch(address[],address[])'
            | 'balanceOfTokenBatch'
            | 'balanceOfTokenBatch(address[],address[])'
            | 'disperseErc1155'
            | 'disperseErc1155(address,uint256[],address[],uint256[])'
            | 'disperseErc20'
            | 'disperseErc20(address,address[],uint256[])'
            | 'disperseErc721'
            | 'disperseErc721(address,uint256[],address[])'
            | 'disperseNative'
            | 'disperseNative(address[],uint256[])'
            | 'initialize'
            | 'initialize(address)'
            | 'metaOfErc1155Batch'
            | 'metaOfErc1155Batch(address[],uint256[])'
            | 'metaOfErc721Batch'
            | 'metaOfErc721Batch(address[],uint256[])'
            | 'metaOfTokenBatch'
            | 'metaOfTokenBatch(address[])'
            | 'unwrapNativeToken'
            | 'unwrapNativeToken(uint256,address)'
            | 'wrapNativeToken'
            | 'wrapNativeToken(uint256,address)',
    ): FunctionFragment;

    encodeFunctionData(functionFragment: 'balanceOfErc1155Batch', values: [string, string[], BigNumberish[]]): string;
    encodeFunctionData(
        functionFragment: 'balanceOfErc1155Batch(address,address[],uint256[])',
        values: [string, string[], BigNumberish[]],
    ): string;
    encodeFunctionData(functionFragment: 'balanceOfErc721Batch', values: [string[], string[]]): string;
    encodeFunctionData(
        functionFragment: 'balanceOfErc721Batch(address[],address[])',
        values: [string[], string[]],
    ): string;
    encodeFunctionData(functionFragment: 'balanceOfTokenBatch', values: [string[], string[]]): string;
    encodeFunctionData(
        functionFragment: 'balanceOfTokenBatch(address[],address[])',
        values: [string[], string[]],
    ): string;
    encodeFunctionData(
        functionFragment: 'disperseErc1155',
        values: [string, BigNumberish[], string[], BigNumberish[]],
    ): string;
    encodeFunctionData(
        functionFragment: 'disperseErc1155(address,uint256[],address[],uint256[])',
        values: [string, BigNumberish[], string[], BigNumberish[]],
    ): string;
    encodeFunctionData(functionFragment: 'disperseErc20', values: [string, string[], BigNumberish[]]): string;
    encodeFunctionData(
        functionFragment: 'disperseErc20(address,address[],uint256[])',
        values: [string, string[], BigNumberish[]],
    ): string;
    encodeFunctionData(functionFragment: 'disperseErc721', values: [string, BigNumberish[], string[]]): string;
    encodeFunctionData(
        functionFragment: 'disperseErc721(address,uint256[],address[])',
        values: [string, BigNumberish[], string[]],
    ): string;
    encodeFunctionData(functionFragment: 'disperseNative', values: [string[], BigNumberish[]]): string;
    encodeFunctionData(
        functionFragment: 'disperseNative(address[],uint256[])',
        values: [string[], BigNumberish[]],
    ): string;
    encodeFunctionData(functionFragment: 'initialize', values: [string]): string;
    encodeFunctionData(functionFragment: 'initialize(address)', values: [string]): string;
    encodeFunctionData(functionFragment: 'metaOfErc1155Batch', values: [string[], BigNumberish[]]): string;
    encodeFunctionData(
        functionFragment: 'metaOfErc1155Batch(address[],uint256[])',
        values: [string[], BigNumberish[]],
    ): string;
    encodeFunctionData(functionFragment: 'metaOfErc721Batch', values: [string[], BigNumberish[]]): string;
    encodeFunctionData(
        functionFragment: 'metaOfErc721Batch(address[],uint256[])',
        values: [string[], BigNumberish[]],
    ): string;
    encodeFunctionData(functionFragment: 'metaOfTokenBatch', values: [string[]]): string;
    encodeFunctionData(functionFragment: 'metaOfTokenBatch(address[])', values: [string[]]): string;
    encodeFunctionData(functionFragment: 'unwrapNativeToken', values: [BigNumberish, string]): string;
    encodeFunctionData(functionFragment: 'unwrapNativeToken(uint256,address)', values: [BigNumberish, string]): string;
    encodeFunctionData(functionFragment: 'wrapNativeToken', values: [BigNumberish, string]): string;
    encodeFunctionData(functionFragment: 'wrapNativeToken(uint256,address)', values: [BigNumberish, string]): string;

    decodeFunctionResult(functionFragment: 'balanceOfErc1155Batch', data: BytesLike): Result;
    decodeFunctionResult(
        functionFragment: 'balanceOfErc1155Batch(address,address[],uint256[])',
        data: BytesLike,
    ): Result;
    decodeFunctionResult(functionFragment: 'balanceOfErc721Batch', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'balanceOfErc721Batch(address[],address[])', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'balanceOfTokenBatch', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'balanceOfTokenBatch(address[],address[])', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'disperseErc1155', data: BytesLike): Result;
    decodeFunctionResult(
        functionFragment: 'disperseErc1155(address,uint256[],address[],uint256[])',
        data: BytesLike,
    ): Result;
    decodeFunctionResult(functionFragment: 'disperseErc20', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'disperseErc20(address,address[],uint256[])', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'disperseErc721', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'disperseErc721(address,uint256[],address[])', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'disperseNative', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'disperseNative(address[],uint256[])', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'initialize', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'initialize(address)', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'metaOfErc1155Batch', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'metaOfErc1155Batch(address[],uint256[])', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'metaOfErc721Batch', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'metaOfErc721Batch(address[],uint256[])', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'metaOfTokenBatch', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'metaOfTokenBatch(address[])', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'unwrapNativeToken', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'unwrapNativeToken(uint256,address)', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'wrapNativeToken', data: BytesLike): Result;
    decodeFunctionResult(functionFragment: 'wrapNativeToken(uint256,address)', data: BytesLike): Result;

    events: {
        'Initialized(uint8)': EventFragment;
    };

    getEvent(nameOrSignatureOrTopic: 'Initialized'): EventFragment;
    getEvent(nameOrSignatureOrTopic: 'Initialized(uint8)'): EventFragment;
}

export interface InitializedEventObject {
    version: number;
}
export type InitializedEvent = TypedEvent<[number], InitializedEventObject>;

export type InitializedEventFilter = TypedEventFilter<InitializedEvent>;

export interface TokenAssistant extends BaseContract {
    contractName: 'TokenAssistant';

    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;

    interface: TokenAssistantInterface;

    queryFilter<TEvent extends TypedEvent>(
        event: TypedEventFilter<TEvent>,
        fromBlockOrBlockhash?: string | number | undefined,
        toBlock?: string | number | undefined,
    ): Promise<Array<TEvent>>;

    listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>;
    listeners(eventName?: string): Array<Listener>;
    removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this;
    removeAllListeners(eventName?: string): this;
    off: OnEvent<this>;
    on: OnEvent<this>;
    once: OnEvent<this>;
    removeListener: OnEvent<this>;

    functions: {
        balanceOfErc1155Batch(
            token: string,
            targets: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        'balanceOfErc1155Batch(address,address[],uint256[])'(
            token: string,
            targets: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        balanceOfErc721Batch(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        'balanceOfErc721Batch(address[],address[])'(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        balanceOfTokenBatch(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        'balanceOfTokenBatch(address[],address[])'(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        disperseErc1155(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            amounts: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<ContractTransaction>;

        'disperseErc1155(address,uint256[],address[],uint256[])'(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            amounts: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<ContractTransaction>;

        disperseErc20(
            token: string,
            recipients: string[],
            values: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<ContractTransaction>;

        'disperseErc20(address,address[],uint256[])'(
            token: string,
            recipients: string[],
            values: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<ContractTransaction>;

        disperseErc721(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            overrides?: Overrides & { from?: string },
        ): Promise<ContractTransaction>;

        'disperseErc721(address,uint256[],address[])'(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            overrides?: Overrides & { from?: string },
        ): Promise<ContractTransaction>;

        disperseNative(
            recipients: string[],
            values: BigNumberish[],
            overrides?: PayableOverrides & { from?: string },
        ): Promise<ContractTransaction>;

        'disperseNative(address[],uint256[])'(
            recipients: string[],
            values: BigNumberish[],
            overrides?: PayableOverrides & { from?: string },
        ): Promise<ContractTransaction>;

        initialize(
            _wrappedNativeToken: string,
            overrides?: Overrides & { from?: string },
        ): Promise<ContractTransaction>;

        'initialize(address)'(
            _wrappedNativeToken: string,
            overrides?: Overrides & { from?: string },
        ): Promise<ContractTransaction>;

        metaOfErc1155Batch(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<[Erc1155MetaInfoStructOutput[]]>;

        'metaOfErc1155Batch(address[],uint256[])'(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<[Erc1155MetaInfoStructOutput[]]>;

        metaOfErc721Batch(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<[Erc721MetaInfoStructOutput[]]>;

        'metaOfErc721Batch(address[],uint256[])'(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<[Erc721MetaInfoStructOutput[]]>;

        metaOfTokenBatch(tokens: string[], overrides?: CallOverrides): Promise<[TokenMetaInfoStructOutput[]]>;

        'metaOfTokenBatch(address[])'(
            tokens: string[],
            overrides?: CallOverrides,
        ): Promise<[TokenMetaInfoStructOutput[]]>;

        unwrapNativeToken(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<ContractTransaction>;

        'unwrapNativeToken(uint256,address)'(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<ContractTransaction>;

        wrapNativeToken(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<ContractTransaction>;

        'wrapNativeToken(uint256,address)'(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<ContractTransaction>;
    };

    balanceOfErc1155Batch(
        token: string,
        targets: string[],
        tokenIds: BigNumberish[],
        overrides?: CallOverrides,
    ): Promise<
        [BlockInfoStructOutput, BigNumber[][]] & {
            blockInfo: BlockInfoStructOutput;
            balances: BigNumber[][];
        }
    >;

    'balanceOfErc1155Batch(address,address[],uint256[])'(
        token: string,
        targets: string[],
        tokenIds: BigNumberish[],
        overrides?: CallOverrides,
    ): Promise<
        [BlockInfoStructOutput, BigNumber[][]] & {
            blockInfo: BlockInfoStructOutput;
            balances: BigNumber[][];
        }
    >;

    balanceOfErc721Batch(
        tokens: string[],
        targets: string[],
        overrides?: CallOverrides,
    ): Promise<
        [BlockInfoStructOutput, BigNumber[][]] & {
            blockInfo: BlockInfoStructOutput;
            balances: BigNumber[][];
        }
    >;

    'balanceOfErc721Batch(address[],address[])'(
        tokens: string[],
        targets: string[],
        overrides?: CallOverrides,
    ): Promise<
        [BlockInfoStructOutput, BigNumber[][]] & {
            blockInfo: BlockInfoStructOutput;
            balances: BigNumber[][];
        }
    >;

    balanceOfTokenBatch(
        tokens: string[],
        targets: string[],
        overrides?: CallOverrides,
    ): Promise<
        [BlockInfoStructOutput, BigNumber[][]] & {
            blockInfo: BlockInfoStructOutput;
            balances: BigNumber[][];
        }
    >;

    'balanceOfTokenBatch(address[],address[])'(
        tokens: string[],
        targets: string[],
        overrides?: CallOverrides,
    ): Promise<
        [BlockInfoStructOutput, BigNumber[][]] & {
            blockInfo: BlockInfoStructOutput;
            balances: BigNumber[][];
        }
    >;

    disperseErc1155(
        token: string,
        tokenIds: BigNumberish[],
        recipients: string[],
        amounts: BigNumberish[],
        overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>;

    'disperseErc1155(address,uint256[],address[],uint256[])'(
        token: string,
        tokenIds: BigNumberish[],
        recipients: string[],
        amounts: BigNumberish[],
        overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>;

    disperseErc20(
        token: string,
        recipients: string[],
        values: BigNumberish[],
        overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>;

    'disperseErc20(address,address[],uint256[])'(
        token: string,
        recipients: string[],
        values: BigNumberish[],
        overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>;

    disperseErc721(
        token: string,
        tokenIds: BigNumberish[],
        recipients: string[],
        overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>;

    'disperseErc721(address,uint256[],address[])'(
        token: string,
        tokenIds: BigNumberish[],
        recipients: string[],
        overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>;

    disperseNative(
        recipients: string[],
        values: BigNumberish[],
        overrides?: PayableOverrides & { from?: string },
    ): Promise<ContractTransaction>;

    'disperseNative(address[],uint256[])'(
        recipients: string[],
        values: BigNumberish[],
        overrides?: PayableOverrides & { from?: string },
    ): Promise<ContractTransaction>;

    initialize(_wrappedNativeToken: string, overrides?: Overrides & { from?: string }): Promise<ContractTransaction>;

    'initialize(address)'(
        _wrappedNativeToken: string,
        overrides?: Overrides & { from?: string },
    ): Promise<ContractTransaction>;

    metaOfErc1155Batch(
        tokens: string[],
        tokenIds: BigNumberish[],
        overrides?: CallOverrides,
    ): Promise<Erc1155MetaInfoStructOutput[]>;

    'metaOfErc1155Batch(address[],uint256[])'(
        tokens: string[],
        tokenIds: BigNumberish[],
        overrides?: CallOverrides,
    ): Promise<Erc1155MetaInfoStructOutput[]>;

    metaOfErc721Batch(
        tokens: string[],
        tokenIds: BigNumberish[],
        overrides?: CallOverrides,
    ): Promise<Erc721MetaInfoStructOutput[]>;

    'metaOfErc721Batch(address[],uint256[])'(
        tokens: string[],
        tokenIds: BigNumberish[],
        overrides?: CallOverrides,
    ): Promise<Erc721MetaInfoStructOutput[]>;

    metaOfTokenBatch(tokens: string[], overrides?: CallOverrides): Promise<TokenMetaInfoStructOutput[]>;

    'metaOfTokenBatch(address[])'(tokens: string[], overrides?: CallOverrides): Promise<TokenMetaInfoStructOutput[]>;

    unwrapNativeToken(
        amount: BigNumberish,
        to: string,
        overrides?: PayableOverrides & { from?: string },
    ): Promise<ContractTransaction>;

    'unwrapNativeToken(uint256,address)'(
        amount: BigNumberish,
        to: string,
        overrides?: PayableOverrides & { from?: string },
    ): Promise<ContractTransaction>;

    wrapNativeToken(
        amount: BigNumberish,
        to: string,
        overrides?: PayableOverrides & { from?: string },
    ): Promise<ContractTransaction>;

    'wrapNativeToken(uint256,address)'(
        amount: BigNumberish,
        to: string,
        overrides?: PayableOverrides & { from?: string },
    ): Promise<ContractTransaction>;

    callStatic: {
        balanceOfErc1155Batch(
            token: string,
            targets: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        'balanceOfErc1155Batch(address,address[],uint256[])'(
            token: string,
            targets: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        balanceOfErc721Batch(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        'balanceOfErc721Batch(address[],address[])'(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        balanceOfTokenBatch(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        'balanceOfTokenBatch(address[],address[])'(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<
            [BlockInfoStructOutput, BigNumber[][]] & {
                blockInfo: BlockInfoStructOutput;
                balances: BigNumber[][];
            }
        >;

        disperseErc1155(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            amounts: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<void>;

        'disperseErc1155(address,uint256[],address[],uint256[])'(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            amounts: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<void>;

        disperseErc20(
            token: string,
            recipients: string[],
            values: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<void>;

        'disperseErc20(address,address[],uint256[])'(
            token: string,
            recipients: string[],
            values: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<void>;

        disperseErc721(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            overrides?: CallOverrides,
        ): Promise<void>;

        'disperseErc721(address,uint256[],address[])'(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            overrides?: CallOverrides,
        ): Promise<void>;

        disperseNative(recipients: string[], values: BigNumberish[], overrides?: CallOverrides): Promise<void>;

        'disperseNative(address[],uint256[])'(
            recipients: string[],
            values: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<void>;

        initialize(_wrappedNativeToken: string, overrides?: CallOverrides): Promise<void>;

        'initialize(address)'(_wrappedNativeToken: string, overrides?: CallOverrides): Promise<void>;

        metaOfErc1155Batch(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<Erc1155MetaInfoStructOutput[]>;

        'metaOfErc1155Batch(address[],uint256[])'(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<Erc1155MetaInfoStructOutput[]>;

        metaOfErc721Batch(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<Erc721MetaInfoStructOutput[]>;

        'metaOfErc721Batch(address[],uint256[])'(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<Erc721MetaInfoStructOutput[]>;

        metaOfTokenBatch(tokens: string[], overrides?: CallOverrides): Promise<TokenMetaInfoStructOutput[]>;

        'metaOfTokenBatch(address[])'(
            tokens: string[],
            overrides?: CallOverrides,
        ): Promise<TokenMetaInfoStructOutput[]>;

        unwrapNativeToken(amount: BigNumberish, to: string, overrides?: CallOverrides): Promise<void>;

        'unwrapNativeToken(uint256,address)'(
            amount: BigNumberish,
            to: string,
            overrides?: CallOverrides,
        ): Promise<void>;

        wrapNativeToken(amount: BigNumberish, to: string, overrides?: CallOverrides): Promise<void>;

        'wrapNativeToken(uint256,address)'(amount: BigNumberish, to: string, overrides?: CallOverrides): Promise<void>;
    };

    filters: {
        'Initialized(uint8)'(version?: null): InitializedEventFilter;
        Initialized(version?: null): InitializedEventFilter;
    };

    estimateGas: {
        balanceOfErc1155Batch(
            token: string,
            targets: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        'balanceOfErc1155Batch(address,address[],uint256[])'(
            token: string,
            targets: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        balanceOfErc721Batch(tokens: string[], targets: string[], overrides?: CallOverrides): Promise<BigNumber>;

        'balanceOfErc721Batch(address[],address[])'(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        balanceOfTokenBatch(tokens: string[], targets: string[], overrides?: CallOverrides): Promise<BigNumber>;

        'balanceOfTokenBatch(address[],address[])'(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        disperseErc1155(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            amounts: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<BigNumber>;

        'disperseErc1155(address,uint256[],address[],uint256[])'(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            amounts: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<BigNumber>;

        disperseErc20(
            token: string,
            recipients: string[],
            values: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<BigNumber>;

        'disperseErc20(address,address[],uint256[])'(
            token: string,
            recipients: string[],
            values: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<BigNumber>;

        disperseErc721(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            overrides?: Overrides & { from?: string },
        ): Promise<BigNumber>;

        'disperseErc721(address,uint256[],address[])'(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            overrides?: Overrides & { from?: string },
        ): Promise<BigNumber>;

        disperseNative(
            recipients: string[],
            values: BigNumberish[],
            overrides?: PayableOverrides & { from?: string },
        ): Promise<BigNumber>;

        'disperseNative(address[],uint256[])'(
            recipients: string[],
            values: BigNumberish[],
            overrides?: PayableOverrides & { from?: string },
        ): Promise<BigNumber>;

        initialize(_wrappedNativeToken: string, overrides?: Overrides & { from?: string }): Promise<BigNumber>;

        'initialize(address)'(
            _wrappedNativeToken: string,
            overrides?: Overrides & { from?: string },
        ): Promise<BigNumber>;

        metaOfErc1155Batch(tokens: string[], tokenIds: BigNumberish[], overrides?: CallOverrides): Promise<BigNumber>;

        'metaOfErc1155Batch(address[],uint256[])'(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        metaOfErc721Batch(tokens: string[], tokenIds: BigNumberish[], overrides?: CallOverrides): Promise<BigNumber>;

        'metaOfErc721Batch(address[],uint256[])'(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<BigNumber>;

        metaOfTokenBatch(tokens: string[], overrides?: CallOverrides): Promise<BigNumber>;

        'metaOfTokenBatch(address[])'(tokens: string[], overrides?: CallOverrides): Promise<BigNumber>;

        unwrapNativeToken(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<BigNumber>;

        'unwrapNativeToken(uint256,address)'(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<BigNumber>;

        wrapNativeToken(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<BigNumber>;

        'wrapNativeToken(uint256,address)'(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<BigNumber>;
    };

    populateTransaction: {
        balanceOfErc1155Batch(
            token: string,
            targets: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        'balanceOfErc1155Batch(address,address[],uint256[])'(
            token: string,
            targets: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        balanceOfErc721Batch(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        'balanceOfErc721Batch(address[],address[])'(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        balanceOfTokenBatch(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        'balanceOfTokenBatch(address[],address[])'(
            tokens: string[],
            targets: string[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        disperseErc1155(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            amounts: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        'disperseErc1155(address,uint256[],address[],uint256[])'(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            amounts: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        disperseErc20(
            token: string,
            recipients: string[],
            values: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        'disperseErc20(address,address[],uint256[])'(
            token: string,
            recipients: string[],
            values: BigNumberish[],
            overrides?: Overrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        disperseErc721(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            overrides?: Overrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        'disperseErc721(address,uint256[],address[])'(
            token: string,
            tokenIds: BigNumberish[],
            recipients: string[],
            overrides?: Overrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        disperseNative(
            recipients: string[],
            values: BigNumberish[],
            overrides?: PayableOverrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        'disperseNative(address[],uint256[])'(
            recipients: string[],
            values: BigNumberish[],
            overrides?: PayableOverrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        initialize(
            _wrappedNativeToken: string,
            overrides?: Overrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        'initialize(address)'(
            _wrappedNativeToken: string,
            overrides?: Overrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        metaOfErc1155Batch(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        'metaOfErc1155Batch(address[],uint256[])'(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        metaOfErc721Batch(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        'metaOfErc721Batch(address[],uint256[])'(
            tokens: string[],
            tokenIds: BigNumberish[],
            overrides?: CallOverrides,
        ): Promise<PopulatedTransaction>;

        metaOfTokenBatch(tokens: string[], overrides?: CallOverrides): Promise<PopulatedTransaction>;

        'metaOfTokenBatch(address[])'(tokens: string[], overrides?: CallOverrides): Promise<PopulatedTransaction>;

        unwrapNativeToken(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        'unwrapNativeToken(uint256,address)'(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        wrapNativeToken(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<PopulatedTransaction>;

        'wrapNativeToken(uint256,address)'(
            amount: BigNumberish,
            to: string,
            overrides?: PayableOverrides & { from?: string },
        ): Promise<PopulatedTransaction>;
    };
}
