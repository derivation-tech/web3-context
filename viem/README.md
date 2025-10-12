# Viem Context

A robust, clean, and efficient `viem`-based utility library for interacting with EVM chains. Provides address book management, contract parsers, transaction helpers, and ERC20/WETH utilities with comprehensive logging and type safety.

## Features

- **Singleton Chain Management**: `ChainKitRegistry` provides per-chain utilities
- **Address Book**: Human-readable address mapping with case-insensitive lookups
- **Token Registry**: ERC20 token information with decimals and formatting
- **Contract Parsers**: Custom parsers for better transaction/event logging
- **Transaction Helpers**: Simplified transaction sending with logging
- **ERC20 Utilities**: Common ERC20 operations with reduced boilerplate
- **WETH Support**: Wrapped native token deposit/withdraw functions
- **Batch Operations**: Efficient batch transaction sending
- **Type Safety**: Full TypeScript support with viem types

## Installation

```bash
npm install @derivation-tech/viem-context
```

## Quick Start

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { ChainKitRegistry, ERC20, WETH } from '@derivation-tech/viem-context';
import { mnemonicToAccount } from 'viem/accounts';

// Setup
const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

const walletClient = createWalletClient({
    account: mnemonicToAccount('your mnemonic here'),
    chain: base,
    transport: http(),
});

const kit = ChainKitRegistry.for(base);

// Query ERC20 balance
const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const balance = await ERC20.balanceOf(publicClient, usdcAddress, walletClient.account.address);
const formatted = kit.formatErc20Amount(balance, usdcAddress);
console.log(`USDC Balance: ${formatted}`);

// Deposit ETH to WETH
const receipt = await WETH.deposit(publicClient, walletClient, kit, '0.1');
console.log(`Deposited 0.1 ETH to WETH: ${receipt.transactionHash}`);
```

## Core Components

### ChainKitRegistry

Singleton manager for chain-specific utilities:

```typescript
import { ChainKitRegistry } from '@derivation-tech/viem-context';

const kit = ChainKitRegistry.for(base);
// Returns the same instance for base chain across your app
```

### ChainKit

Per-chain utilities containing address book, token registry, and parsers:

```typescript
// Address book
kit.addressBook.registerAddressName('0x...', 'MyContract');
const name = kit.addressBook.getAddressName('0x...'); // 'MyContract'

// Token registry
kit.registerErc20Token({
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x...',
    decimals: 6,
});

// Formatting
const formatted = kit.formatErc20Amount(balance, tokenAddress);
const parsed = kit.parseErc20Amount('100.5', tokenAddress);
```

### ERC20 Utilities

Common ERC20 operations with reduced boilerplate:

```typescript
import { ERC20 } from '@derivation-tech/viem-context';

// Read operations
const balance = await ERC20.balanceOf(publicClient, token, account);
const allowance = await ERC20.allowanceOf(publicClient, token, owner, spender);
const totalSupply = await ERC20.totalSupply(publicClient, token);

// Write operations (with logging)
const receipt = await ERC20.transfer(publicClient, walletClient, kit, token, to, amount);
const receipt = await ERC20.approve(publicClient, walletClient, kit, token, spender, amount);

// Batch operations
const balances = await ERC20.batchBalanceOf(publicClient, token, accounts);
```

### WETH Utilities

Wrapped native token operations:

```typescript
import { WETH } from '@derivation-tech/viem-context';

// Deposit native token to wrapped token
const receipt = await WETH.deposit(publicClient, walletClient, kit, '0.1');

// Withdraw wrapped token to native token
const receipt = await WETH.withdraw(publicClient, walletClient, kit, '0.05');
```

### Transaction Helpers

Simplified transaction sending with comprehensive logging:

```typescript
import { sendTxWithLog, sendTxSilent, batchSendTxWithLog } from '@derivation-tech/viem-context';

// Single transaction with logging
const receipt = await sendTxWithLog(publicClient, walletClient, kit, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, amount],
});

// Silent transaction (no logging)
const receipt = await sendTxSilent(publicClient, walletClient, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, amount],
});

// Batch transactions
const receipts = await batchSendTxWithLog(publicClient, walletClients, kit, txs);
```

### Contract Parsers

Custom parsers for better transaction and event logging:

```typescript
import { createERC20Parser, createWETHParser } from '@derivation-tech/viem-context';

// ERC20 parser
const erc20Parser = createERC20Parser(tokenInfo, kit.addressBook.getAddressName);
kit.registerParser(tokenAddress, erc20Parser);

// WETH parser (includes deposit/withdraw)
const wethParser = createWETHParser(wethInfo, kit.addressBook.getAddressName);
kit.registerParser(wethAddress, wethParser);
```

## Token Registry

### Wrapped Native Tokens

Pre-configured wrapped native tokens for 30+ chains:

```typescript
import { WRAPPED_NATIVE_TOKENS, getWrappedNativeToken } from '@derivation-tech/viem-context';

// Get wrapped token info for a chain
const wrappedToken = getWrappedNativeToken(8453); // Base
console.log(wrappedToken); // { symbol: 'WETH', address: '0x...', decimals: 18 }
```

### Common ERC20 Tokens

Pre-configured common ERC20 tokens:

```typescript
import { COMMON_ERC20_TOKENS, getCommonErc20Tokens } from '@derivation-tech/viem-context';

// Get common tokens for a chain
const commonTokens = getCommonErc20Tokens(8453); // Base
console.log(commonTokens); // Array of Erc20TokenInfo
```

## Examples

See the `examples/` directory for complete examples:

- `abc-testnet.ts` - Custom chain setup
- `abc-transfer.ts` - ERC20 transfer on custom chain
- `batch-transfer.ts` - Batch ERC20 transfers
- `erc20-transfer.ts` - Standard ERC20 operations
- `singleton.ts` - Singleton pattern usage
- `weth-deposit-withdraw.ts` - WETH operations

## API Reference

### ChainKitRegistry

- `for(chain: Chain): ChainKit` - Get or create ChainKit for chain

### ChainKit

- `addressBook: AddressBook` - Address-to-name mappings
- `tokens: Map<Address, Erc20TokenInfo>` - Token registry
- `parsers: Map<Address, ContractParser>` - Contract parsers
- `registerErc20Token(tokenInfo: Erc20TokenInfo): void` - Register token
- `getErc20TokenInfo(address: Address): Erc20TokenInfo | undefined` - Get token info
- `formatErc20Amount(amount: bigint, address: Address): string` - Format amount
- `parseErc20Amount(amount: string, address: Address): bigint` - Parse amount
- `isNativeToken(address: Address): boolean` - Check if native token
- `isWrappedNativeToken(address: Address): boolean` - Check if wrapped native token

### ERC20

- `balanceOf(publicClient, token, account): Promise<bigint>` - Get balance
- `allowanceOf(publicClient, token, owner, spender): Promise<bigint>` - Get allowance
- `transfer(publicClient, walletClient, kit, token, to, amount): Promise<TransactionReceipt>` - Transfer
- `approve(publicClient, walletClient, kit, token, spender, amount): Promise<TransactionReceipt>` - Approve
- `batchBalanceOf(publicClient, token, accounts): Promise<bigint[]>` - Batch balances

### WETH

- `deposit(publicClient, walletClient, kit, amount): Promise<TransactionReceipt>` - Deposit
- `withdraw(publicClient, walletClient, kit, amount): Promise<TransactionReceipt>` - Withdraw

## Type Safety

The library provides full TypeScript support with viem types:

```typescript
import type { Address, PublicClient, WalletClient, TransactionReceipt } from '@derivation-tech/viem-context';
import type { Erc20TokenInfo, ContractParser } from '@derivation-tech/viem-context';
```

## Error Handling

All functions include proper error handling and logging:

```typescript
try {
    const receipt = await ERC20.transfer(publicClient, walletClient, kit, token, to, amount);
    console.log('Transfer successful:', receipt.transactionHash);
} catch (error) {
    console.error('Transfer failed:', error);
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
