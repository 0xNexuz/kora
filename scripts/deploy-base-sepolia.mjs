import { createPublicClient, createWalletClient, http, formatEther, formatUnits, erc20Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const RPC_URL = process.env.KORA_RPC_URL || 'https://sepolia.base.org';
const USDC_ADDRESS = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';

async function main() {
  const deployerFile = new URL('../.local/deployer.json', import.meta.url);
  if (!existsSync(deployerFile)) {
    console.error('No deployer key found at .local/deployer.json.');
    process.exit(1);
  }

  const { privateKey } = JSON.parse(readFileSync(deployerFile, 'utf8'));
  const account = privateKeyToAccount(privateKey);

  console.log('----------------------------------------------------');
  console.log('Kora Base Sepolia Deployment Tool');
  console.log('----------------------------------------------------');
  console.log(`Deployer Address : ${account.address}`);
  console.log(`Network          : Base Sepolia (Chain ID 84532)`);
  console.log(`RPC Endpoint     : ${RPC_URL}`);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const [ethBalance, usdcBalance] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    }).catch(() => 0n),
  ]);

  console.log(`ETH Balance      : ${formatEther(ethBalance)} ETH`);
  console.log(`USDC Balance     : ${formatUnits(usdcBalance, 6)} USDC`);
  console.log('----------------------------------------------------');

  if (ethBalance < 1000000000000000n) { // < 0.001 ETH
    console.log('\n[!] ACTION REQUIRED:');
    console.log(`Please send at least 0.005 Base Sepolia ETH to:`);
    console.log(`>>> ${account.address} <<<`);
    console.log(`\nFaucets:`);
    console.log(`- https://www.alchemy.com/faucets/base-sepolia`);
    console.log(`- https://faucets.chain.link/base-sepolia`);
    console.log(`- https://superchain.faucet.id/`);
    console.log(`\nOptional Test USDC Faucet:`);
    console.log(`- https://faucet.circle.com/ (Select Base Sepolia)`);
    return;
  }

  const artifactPath = new URL('../backend/artifacts/KoraFacility.json', import.meta.url);
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

  console.log('Deploying KoraFacility contract...');
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [USDC_ADDRESS, account.address],
  });

  console.log(`Deployment transaction submitted: ${hash}`);
  console.log(`BaseScan URL: https://sepolia.basescan.org/tx/${hash}`);
  console.log('Waiting for transaction confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Contract deployed successfully!`);
  console.log(`Contract Address: ${receipt.contractAddress}`);
  console.log(`Block Number    : ${receipt.blockNumber}`);

  mkdirSync(new URL('../evidence/transactions', import.meta.url), { recursive: true });
  const deploymentRecord = {
    chainId: 84532,
    address: receipt.contractAddress,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    blockHash: receipt.blockHash,
    explorer: `https://sepolia.basescan.org/tx/${hash}`,
    status: 'REAL — TESTNET',
    deployedAt: new Date().toISOString(),
    deployer: account.address,
  };

  writeFileSync(
    new URL('../evidence/transactions/base-sepolia-deployment.json', import.meta.url),
    JSON.stringify(deploymentRecord, null, 2),
  );
  console.log('Saved deployment record to evidence/transactions/base-sepolia-deployment.json');
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
