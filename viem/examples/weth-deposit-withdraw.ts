import 'dotenv/config';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { base } from 'viem/chains';
import { ChainKitRegistry, WETH, ERC20 } from '../index';
import { mnemonicToAccount } from 'viem/accounts';

async function main() {
    console.log('🔄 WETH Deposit & Withdraw Example\n');

    // Setup
    const chain = base;
    const kit = ChainKitRegistry.for(chain);
    const account = mnemonicToAccount(process.env.NEO_MNEMONIC!, { addressIndex: 0 });

    const publicClient = createPublicClient({
        chain,
        transport: http(),
    });

    const walletClient = createWalletClient({
        account,
        chain,
        transport: http(),
    });

    console.log(`📋 Account: ${kit.addressBook.formatAddress(account.address)}`);
    console.log(`🌐 Chain: ${chain.name} (${chain.id})`);
    console.log(`💰 Native Token: ${chain.nativeCurrency.symbol}`);

    // Get wrapped native token info
    const wrappedTokenInfo = kit.getErc20TokenInfo(chain.contracts?.wrappedEther?.address!);
    if (wrappedTokenInfo) {
        console.log(`🔗 Wrapped Token: ${wrappedTokenInfo.symbol} (${wrappedTokenInfo.name})`);
        console.log(`   Address: ${kit.addressBook.formatAddress(wrappedTokenInfo.address)}`);
    }

    try {
        // 1. Check initial balances
        console.log('\n📊 Initial Balances:');
        const initialEthBalance = await walletClient.getBalance({ address: account.address });
        const initialWethBalance = await ERC20.balanceOf(
            publicClient,
            chain.contracts?.wrappedEther?.address!,
            account.address
        );

        console.log(`   ETH: ${initialEthBalance / parseEther('1')} ETH`);
        console.log(
            `   WETH: ${kit.formatErc20Amount(initialWethBalance, chain.contracts?.wrappedEther?.address!)} WETH`
        );

        // 2. Deposit 0.01 ETH to WETH
        const depositAmount = '0.01';
        console.log(`\n🔄 Depositing ${depositAmount} ETH to WETH...`);

        const depositReceipt = await WETH.deposit(publicClient, walletClient, kit, depositAmount);

        // 3. Check balances after deposit
        console.log('\n📊 Balances After Deposit:');
        const afterDepositEthBalance = await walletClient.getBalance({ address: account.address });
        const afterDepositWethBalance = await ERC20.balanceOf(
            publicClient,
            chain.contracts?.wrappedEther?.address!,
            account.address
        );

        console.log(`   ETH: ${afterDepositEthBalance / parseEther('1')} ETH`);
        console.log(
            `   WETH: ${kit.formatErc20Amount(afterDepositWethBalance, chain.contracts?.wrappedEther?.address!)} WETH`
        );

        const ethDelta = (afterDepositEthBalance - initialEthBalance) / parseEther('1');
        console.log(`   ETH Delta: ${ethDelta} ETH`);
        console.log(`   WETH Delta: ${parseFloat(afterDepositWethBalance) - parseFloat(initialWethBalance)} WETH`);

        // 4. Withdraw half of the WETH back to ETH
        const withdrawAmount = (parseFloat(afterDepositWethBalance) / 2).toString();
        console.log(`\n🔄 Withdrawing ${withdrawAmount} WETH to ETH...`);

        const withdrawReceipt = await WETH.withdraw(publicClient, walletClient, kit, withdrawAmount);

        // 5. Check final balances
        console.log('\n📊 Final Balances:');
        const finalEthBalance = await walletClient.getBalance({ address: account.address });
        const finalWethBalance = await ERC20.balanceOf(
            publicClient,
            chain.contracts?.wrappedEther?.address!,
            account.address
        );

        console.log(`   ETH: ${finalEthBalance / parseEther('1')} ETH`);
        console.log(
            `   WETH: ${kit.formatErc20Amount(finalWethBalance, chain.contracts?.wrappedEther?.address!)} WETH`
        );

        const totalEthDelta = (finalEthBalance - initialEthBalance) / parseEther('1');
        const totalWethDelta = parseFloat(finalWethBalance) - parseFloat(initialWethBalance);
        console.log(`   Total ETH Delta: ${totalEthDelta} ETH`);
        console.log(`   Total WETH Delta: ${totalWethDelta} WETH`);

        console.log('\n✅ WETH Deposit & Withdraw completed successfully!');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main().catch(console.error);
