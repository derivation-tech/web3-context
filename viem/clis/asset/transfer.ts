import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import type { Address } from 'viem';
import { ChainKitRegistry, ERC20, getAccount } from '../../index';
import { getRpcUrl } from './utils';

/**
 * Transfer command handler
 */

export async function handleTransfer(args: string[], options: any) {
    const [tokenSymbol] = args;
    const { network, from, to, amounts, batch } = options;

    console.log(`\n💸 Transfer on ${network.toUpperCase()}\n`);

    // Get chain context
    const kit = ChainKitRegistry.for(network);
    const rpcUrl = getRpcUrl(network);
    const publicClient = createPublicClient({
        chain: kit.chain,
        transport: http(rpcUrl),
    });

    // Parse from addresses (support mnemonic format)
    const fromAddresses: Address[] = [];
    const accounts: any[] = [];

    for (const fromSpec of from) {
        try {
            const { account } = getAccount(kit, fromSpec);
            accounts.push(account);
            fromAddresses.push(account.address as Address);
        } catch (error) {
            console.error(`❌ ${error}`);
            return;
        }
    }

    // Validate to addresses and amounts
    if (to.length !== amounts.length) {
        console.error('❌ Number of recipients must match number of amounts');
        return;
    }

    try {
        if (tokenSymbol === 'native' || tokenSymbol === 'eth') {
            // Native token transfers
            console.log(`📦 Processing ${to.length} native token transfers...`);

            for (let i = 0; i < to.length; i++) {
                const toAddress = to[i];
                const amountValue = amounts[i];
                const amountWei = parseEther(amountValue);

                // Cycle through from addresses if there are more to addresses
                const fromIndex = i % fromAddresses.length;
                const fromAddress = fromAddresses[fromIndex];
                const account = accounts[fromIndex];

                const walletClient = createWalletClient({
                    account,
                    chain: kit.chain,
                    transport: http(),
                });

                const hash = await walletClient.sendTransaction({
                    account,
                    to: toAddress,
                    value: amountWei,
                });

                console.log(`  ${i + 1}/${to.length} sent: ${hash}`);
                console.log(`     From: [${kit.getAddressName(fromAddress)}]${fromAddress}`);
                console.log(`     To: [${kit.getAddressName(toAddress)}]${toAddress}`);
                console.log(`     Amount: ${amountValue} ${kit.chain.nativeCurrency.symbol}`);

                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                console.log(`  ${i + 1}/${to.length} confirmed in block ${receipt.blockNumber}`);
            }
        } else {
            // ERC20 token transfers
            const tokenInfo = kit.getErc20TokenInfo(tokenSymbol);
            if (!tokenInfo) {
                console.error(`❌ Token ${tokenSymbol} not found`);
                return;
            }

            if (batch) {
                // Batch processing for ERC20 tokens
                console.log(`📦 Batch processing ${to.length} ${tokenInfo.symbol} transfers...`);

                // Group transactions by from address for batch processing
                const txGroups: { [key: string]: any[] } = {};

                for (let i = 0; i < to.length; i++) {
                    const toAddress = to[i];
                    const amountValue = amounts[i];
                    const fromIndex = i % fromAddresses.length;
                    const fromAddress = fromAddresses[fromIndex];

                    if (!txGroups[fromAddress]) {
                        txGroups[fromAddress] = [];
                    }

                    txGroups[fromAddress].push({
                        address: tokenInfo.address,
                        abi: ERC20.ERC20_ABI,
                        functionName: 'transfer' as const,
                        args: [toAddress, kit.parseErc20Amount(amountValue, tokenInfo.address)] as const,
                    });
                }

                // Process each group separately
                for (const [fromAddress, txs] of Object.entries(txGroups)) {
                    const fromIndex = fromAddresses.indexOf(fromAddress as Address);
                    const account = accounts[fromIndex];

                    const walletClient = createWalletClient({
                        account,
                        chain: kit.chain,
                        transport: http(),
                    });

                    console.log(
                        `  Processing ${txs.length} transfers from [${kit.getAddressName(fromAddress as Address)}]${fromAddress}`
                    );

                    const receipts = await ERC20.batchSendTxWithLog(publicClient, [walletClient], kit, txs);

                    console.log(`  ✅ ${receipts.length} transfers completed from ${fromAddress}`);
                    for (let i = 0; i < receipts.length; i++) {
                        console.log(`    ${i + 1}/${receipts.length}: ${receipts[i].transactionHash}`);
                    }
                }
            } else {
                // Sequential processing for ERC20 tokens
                console.log(`📦 Sequential processing ${to.length} ${tokenInfo.symbol} transfers...`);

                for (let i = 0; i < to.length; i++) {
                    const toAddress = to[i];
                    const amountValue = amounts[i];
                    const amountWei = kit.parseErc20Amount(amountValue, tokenInfo.address);

                    // Cycle through from addresses if there are more to addresses
                    const fromIndex = i % fromAddresses.length;
                    const fromAddress = fromAddresses[fromIndex];
                    const account = accounts[fromIndex];

                    const walletClient = createWalletClient({
                        account,
                        chain: kit.chain,
                        transport: http(),
                    });

                    const receipt = await ERC20.transfer(
                        publicClient,
                        walletClient,
                        kit,
                        tokenInfo.address,
                        toAddress,
                        amountWei
                    );

                    console.log(`  ${i + 1}/${to.length} completed: ${receipt.transactionHash}`);
                    console.log(`     From: [${kit.getAddressName(fromAddress)}]${fromAddress}`);
                    console.log(`     To: [${kit.getAddressName(toAddress)}]${toAddress}`);
                    console.log(`     Amount: ${amountValue} ${tokenInfo.symbol}`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Transfer failed:', error);
    }

    console.log('');
}
