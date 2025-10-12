import { createPublicClient, createWalletClient, http, parseEther, formatEther, getAddress } from 'viem';
import type { Address } from 'viem';
import { ChainKitRegistry, ERC20, LoggerFactory, Multicall, getAccount, type Erc20TokenInfo, batchSendTxWithLog } from '../../index';
import { ERC20_ABI } from '../../abis';
import { expandSignerIdPattern } from '../../utils/account';
import { getRpcUrl, readSignerAddressFiles } from './utils';

export async function handleTransfer(token: string, options: any) {
    const tokenSymbol = String(token);
    const { network, from, to, amount, batch } = options;

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

    // Build senders from pattern
    const fromAddresses: Address[] = [];
    const accounts: any[] = [];
    const fromIds: string[] = expandSignerIdPattern(from);
    for (const fromSpec of fromIds) {
        try {
            const account = getAccount(kit, fromSpec);
            accounts.push(account);
            fromAddresses.push(account.address as Address);
        } catch (error) {
            logger.error(`❌ ${error}`);
            return;
        }
    }

    // Build recipients from pattern
    const toIds: string[] = expandSignerIdPattern(to);
    const toAddresses: Address[] = [];
    for (const toSpec of toIds) {
        if (toSpec.startsWith('0x')) {
            toAddresses.push(getAddress(toSpec as Address));
            continue;
        }
        const existing = kit.addressBook.getNamedAddress(toSpec);
        if (existing) {
            toAddresses.push(getAddress(existing as Address));
            continue;
        }
        try {
            const account = getAccount(kit, toSpec);
            toAddresses.push(getAddress(account.address as Address));
        } catch (error) {
            logger.error(`❌ Missing address for recipient '${toSpec}'. Add mapping in ADDRESS_PATH or set credentials.`);
            return;
        }
    }

    const amounts: string[] = String(amount)
    .split(',')
    .map((v: string) => v.trim())
    .filter((v: string) => v.length > 0);

    // Validate recipients and amounts: allow single amount applied to all, or 1:1 mapping
    if (!(amounts.length === 1 || amounts.length === toAddresses.length)) {
        logger.error('❌ Amounts must be either a single value or match recipients count');
        return;
    }

    try {
        const isNative =
            tokenSymbol &&
            (tokenSymbol.toUpperCase() === 'NATIVE' ||
                tokenSymbol.toUpperCase() === kit.nativeTokenInfo.symbol.toUpperCase());
        if (isNative) {
            if (batch) {
                // Batch native transfers: prepare, sign, send concurrently with per-signer nonce management
                type NativeItem = { index: number; fromIndex: number; to: Address; value: bigint };
                const groups = new Map<string, { walletAccountIndex: number; items: NativeItem[] }>();

                for (let i = 0; i < toAddresses.length; i++) {
                    const toAddress = toAddresses[i];
                    const amountValue = amounts.length === 1 ? amounts[0] : amounts[i];
                    const amountWei = parseEther(amountValue);
                    const fromIndex = i % fromAddresses.length;
                    const fromAddress = fromAddresses[fromIndex];
                    const key = fromAddress.toLowerCase();
                    const bucket = groups.get(key) || { walletAccountIndex: fromIndex, items: [] };
                    bucket.items.push({ index: i, fromIndex, to: toAddress, value: amountWei });
                    groups.set(key, bucket);
                }

                // Fetch nonces per signer
                const groupEntries = Array.from(groups.entries());
                const baseNonces = await Promise.all(
                    groupEntries.map(([, g]) =>
                        publicClient.getTransactionCount({ address: fromAddresses[g.walletAccountIndex] })
                    )
                );

                // Prepare & sign
                const signedByIndex: Array<{ index: number; raw: `0x${string}`; from: Address; to: Address; value: bigint }> = [];
                for (let gi = 0; gi < groupEntries.length; gi++) {
                    const [, g] = groupEntries[gi];
                    const startNonce = BigInt(baseNonces[gi]);
                    const fromIdx = g.walletAccountIndex;
                    const account = accounts[fromIdx];
                    const walletClient = createWalletClient({ account, chain: kit.chain, transport: http() });

                    const preparedSigned = await Promise.all(
                        g.items.map(async (item, localIdx) => {
                            const prepared = await walletClient.prepareTransactionRequest({
                                account,
                                chain: kit.chain,
                                to: item.to,
                                value: item.value,
                                nonce: startNonce + BigInt(localIdx),
                            } as any);
                            const raw = (await walletClient.signTransaction(prepared as any)) as `0x${string}`;
                            return { index: item.index, raw, from: fromAddresses[fromIdx], to: item.to, value: item.value };
                        })
                    );
                    signedByIndex.push(...preparedSigned);
                }

                // Broadcast
                const hashesByIndex: Array<`0x${string}`> = new Array(toAddresses.length) as any;
                await Promise.all(
                    signedByIndex.map(async (s) => {
                        const h = await publicClient.sendRawTransaction({ serializedTransaction: s.raw });
                        hashesByIndex[s.index] = h;
                        logger.info(
                            `📤 Sent tx: ${h} [${kit.getAddressName(s.from)}]${s.from} -> [${kit.getAddressName(s.to)}]${s.to} ${formatEther(
                                s.value
                            )} ${kit.nativeTokenInfo.symbol}`
                        );
                    })
                );

                const receipts = await Promise.all(hashesByIndex.map((hash) => publicClient.waitForTransactionReceipt({ hash })));
                for (let i = 0; i < receipts.length; i++) {
                    const r = receipts[i];
                    const s = signedByIndex[i];
                    logger.info(
                        `${i + 1}/${toAddresses.length} ${hashesByIndex[i]} [${kit.getAddressName(s.from)}]${s.from} -> [${kit.getAddressName(
                            s.to
                        )}]${s.to} ${formatEther(s.value)} ${kit.nativeTokenInfo.symbol}`
                    );
                }
            } else {
                for (let i = 0; i < toAddresses.length; i++) {
                    const toAddress = toAddresses[i];
                    const amountValue = amounts.length === 1 ? amounts[0] : amounts[i];
                    const amountWei = parseEther(amountValue);

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

                    const receipt = await publicClient.waitForTransactionReceipt({ hash });
                    logger.info(
                        `${i + 1}/${toAddresses.length} ${receipt.transactionHash} [${kit.getAddressName(
                            fromAddress
                        )}]${fromAddress} -> [${kit.getAddressName(toAddress)}]${toAddress} ${amountValue} ${
                            kit.nativeTokenInfo.symbol
                        }`
                    );
                }
            }
        } else {
            // ERC20 token transfers (token can be symbol or address)
            let tokenInfo: Erc20TokenInfo | undefined;
            if (tokenSymbol.startsWith('0x')) {
                const addr = getAddress(tokenSymbol as Address);
                tokenInfo = kit.getErc20TokenInfo(addr);
                if (!tokenInfo) {
                    const metas = await Multicall.getErc20TokenInfos(publicClient, [addr]);
                    const meta = metas[0];
                    if (!meta) {
                        logger.error(`❌ Unknown ERC20 at ${addr}`);
                        return;
                    }
                    tokenInfo = { address: addr, symbol: meta.symbol, name: meta.name, decimals: meta.decimals };
                    kit.registerErc20Token(tokenInfo);
                    logger.info(`✅ Registered ${tokenInfo.symbol} (${tokenInfo.address})`);
                }
            } else {
                tokenInfo = kit.getErc20TokenInfo(tokenSymbol);
                if (!tokenInfo) {
                    logger.error(
                        `❌ Unknown token symbol ${tokenSymbol}. Known tokens: ${Array.from(kit.tokens.keys()).join(', ')}`
                    );
                    return;
                }
            }

            if (batch) {
                // Prepare one-to-one walletClients & txs arrays (round-robin from[])
                const walletClientsForBatch: any[] = [];
                const txsForBatch: any[] = [];

                for (let i = 0; i < toAddresses.length; i++) {
                    const toAddress = toAddresses[i];
                    const amountValue = amounts.length === 1 ? amounts[0] : amounts[i];
                    const fromIndex = i % fromAddresses.length;
                    const account = accounts[fromIndex];

                    const walletClient = createWalletClient({
                        account,
                        chain: kit.chain,
                        transport: http(),
                    });

                    walletClientsForBatch.push(walletClient);
                    txsForBatch.push({
                        address: tokenInfo.address,
                        abi: ERC20_ABI,
                        functionName: 'transfer' as const,
                        args: [toAddress, kit.parseErc20Amount(amountValue, tokenInfo.address)] as const,
                    });
                }

                await batchSendTxWithLog(publicClient, walletClientsForBatch, kit, txsForBatch);
            } else {
                for (let i = 0; i < toAddresses.length; i++) {
                    const toAddress = toAddresses[i];
                    const amountValue = amounts.length === 1 ? amounts[0] : amounts[i];
                    const amountWei = kit.parseErc20Amount(amountValue, tokenInfo.address);

                    const fromIndex = i % fromAddresses.length;
                    const fromAddress = fromAddresses[fromIndex];
                    const account = accounts[fromIndex];

                    const walletClient = createWalletClient({
                        account,
                        chain: kit.chain,
                        transport: http(),
                    });

                    await ERC20.transfer(
                        publicClient,
                        walletClient,
                        kit,
                        tokenInfo.address,
                        toAddress,
                        amountWei
                    );
                }
            }
        }
    } catch (error) {
        logger.error('❌ Transfer failed:', error);
    }

    logger.info('');
}
