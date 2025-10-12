import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import type { Address } from 'viem';
import { ChainKitRegistry, ERC20, LoggerFactory, getAccount } from '../../index';
import { getRpcUrl, readSignerAddressFiles } from './utils';

export async function handleTransfer(args: string[], options: any) {
    const [tokenSymbol] = args;
    const { network, from, to, amounts, batch } = options;

    const logger = LoggerFactory.getLogger(`${network.charAt(0).toUpperCase() + network.slice(1)}::Transfer`) as any;
    logger.setTimestamp(true);
    logger.info(`💸 Transfer on ${network.toUpperCase()}`);

    const kit = ChainKitRegistry.for(network);
    const rpcUrl = getRpcUrl(network);
    const publicClient = createPublicClient({
        chain: kit.chain,
        transport: http(rpcUrl),
    });

    // Preload address book from files/env (ADDRESS_PATH); optional
    try {
        const entries = readSignerAddressFiles();
        for (const { name, address } of entries) {
            kit.registerAddressName(address, name);
        }
        if (entries.length > 0) {
            logger.info(`📚 Loaded ${entries.length} address mappings from files`);
        }
    } catch {}

    // Parse from addresses (support mnemonic format)
    const fromAddresses: Address[] = [];
    const accounts: any[] = [];

    for (const fromSpec of from) {
        try {
            const { account } = getAccount(kit, fromSpec);
            accounts.push(account);
            fromAddresses.push(account.address as Address);
        } catch (error) {
            logger.error(`❌ ${error}`);
            return;
        }
    }

    // Validate to addresses and amounts
    if (to.length !== amounts.length) {
        logger.error('❌ Number of recipients must match number of amounts');
        return;
    }

    try {
        if (tokenSymbol === 'native' || tokenSymbol === 'eth') {
            // Native token transfers
            logger.info(`📦 Processing ${to.length} native token transfers...`);

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

                logger.info(`  ${i + 1}/${to.length} sent: ${hash}`);
                logger.info(`     From: [${kit.getAddressName(fromAddress)}]${fromAddress}`);
                logger.info(`     To: [${kit.getAddressName(toAddress)}]${toAddress}`);
                logger.info(`     Amount: ${amountValue} ${kit.chain.nativeCurrency.symbol}`);

                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                logger.info(`  ${i + 1}/${to.length} confirmed in block ${receipt.blockNumber}`);
            }
        } else {
            // ERC20 token transfers
            const tokenInfo = kit.getErc20TokenInfo(tokenSymbol);
            if (!tokenInfo) {
                logger.error(`❌ Token ${tokenSymbol} not found`);
                return;
            }

            if (batch) {
                // Batch processing for ERC20 tokens
                logger.info(`📦 Batch processing ${to.length} ${tokenInfo.symbol} transfers...`);

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

                    logger.info(
                        `  Processing ${txs.length} transfers from [${kit.getAddressName(fromAddress as Address)}]${fromAddress}`
                    );

                    const receipts = await ERC20.batchSendTxWithLog(publicClient, [walletClient], kit, txs);

                    logger.info(`  ✅ ${receipts.length} transfers completed from ${fromAddress}`);
                    for (let i = 0; i < receipts.length; i++) {
                        logger.info(`    ${i + 1}/${receipts.length}: ${receipts[i].transactionHash}`);
                    }
                }
            } else {
                // Sequential processing for ERC20 tokens
                logger.info(`📦 Sequential processing ${to.length} ${tokenInfo.symbol} transfers...`);

                for (let i = 0; i < to.length; i++) {
                    const toAddress = to[i];
                    const amountValue = amounts[i];
                    const amountWei = kit.parseErc20Amount(amountValue, tokenInfo.address);

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

                    logger.info(`  ${i + 1}/${to.length} completed: ${receipt.transactionHash}`);
                    logger.info(`     From: [${kit.getAddressName(fromAddress)}]${fromAddress}`);
                    logger.info(`     To: [${kit.getAddressName(toAddress)}]${toAddress}`);
                    logger.info(`     Amount: ${amountValue} ${tokenInfo.symbol}`);
                }
            }
        }
    } catch (error) {
        logger.error('❌ Transfer failed:', error);
    }

    logger.info('');
}


