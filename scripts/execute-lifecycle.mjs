import { createPublicClient, createWalletClient, http, formatEther, formatUnits, erc20Abi, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const RPC_URL = process.env.KORA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const USDC_ADDRESS = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';

async function main() {
  const deployerFile = new URL('../.local/deployer.json', import.meta.url);
  const deploymentFile = new URL('../evidence/transactions/base-sepolia-deployment.json', import.meta.url);

  if (!existsSync(deployerFile) || !existsSync(deploymentFile)) {
    console.error('Missing deployer key or deployment record.');
    process.exit(1);
  }

  const { privateKey } = JSON.parse(readFileSync(deployerFile, 'utf8'));
  const { address: contractAddress } = JSON.parse(readFileSync(deploymentFile, 'utf8'));
  const account = privateKeyToAccount(privateKey);

  console.log('----------------------------------------------------');
  console.log('Kora Base Sepolia Full Financing Lifecycle');
  console.log('----------------------------------------------------');
  console.log(`Operator / Borrower: ${account.address}`);
  console.log(`KoraFacility Address: ${contractAddress}`);

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  const [ethBalance, usdcBalance] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    }).catch(() => 0n),
  ]);

  console.log(`ETH Balance : ${formatEther(ethBalance)} ETH`);
  console.log(`USDC Balance: ${formatUnits(usdcBalance, 6)} USDC`);

  if (usdcBalance < 2000000n) { // Needs at least 2 USDC (e.g. 1 USDC principal + fee)
    console.log('\n[!] Waiting for Test USDC:');
    console.log(`Please claim Base Sepolia test USDC to:`);
    console.log(`>>> ${account.address} <<<`);
    console.log(`Faucet: https://faucet.circle.com/ (Select Base Sepolia)`);
    return;
  }

  const artifactPath = new URL('../backend/artifacts/KoraFacility.json', import.meta.url);
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

  const principal = 1000000n; // 1 USDC
  const fee = 10000n; // 0.01 USDC
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = BigInt(now + 3600);
  const dueAt = BigInt(now + 86400 * 30);

  const nonce = toHex(Date.now(), { size: 32 });
  const agreementId = keccak256(nonce);
  const businessId = keccak256(toHex('adas-pharmacy', { size: 32 }));
  const obligationId = keccak256(toHex('restock-' + Date.now(), { size: 32 }));
  const evidenceId = keccak256(toHex('evidence-' + Date.now(), { size: 32 }));

  const terms = {
    id: agreementId,
    business: businessId,
    obligation: obligationId,
    evidence: evidenceId,
    borrower: account.address,
    principal,
    fee,
    dueAt,
    expiresAt,
  };

  console.log('\n1. Approving USDC allowance for registration...');
  const approveTx = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'approve',
    args: [contractAddress, principal],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  console.log(`   Allowance approved: ${approveTx}`);

  console.log('2. Registering facility agreement terms...');
  const registerTx = await walletClient.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'register',
    args: [terms],
  });
  const regReceipt = await publicClient.waitForTransactionReceipt({ hash: registerTx });
  console.log(`   Registered onchain: ${registerTx} (Block ${regReceipt.blockNumber})`);

  console.log('3. Drawing facility principal to borrower...');
  const drawTx = await walletClient.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'draw',
    args: [agreementId],
  });
  const drawReceipt = await publicClient.waitForTransactionReceipt({ hash: drawTx });
  console.log(`   Principal drawn: ${drawTx} (Block ${drawReceipt.blockNumber})`);

  console.log('4. Approving repayment amount...');
  const repayTotal = principal + fee;
  const repayApproveTx = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'approve',
    args: [contractAddress, repayTotal],
  });
  await publicClient.waitForTransactionReceipt({ hash: repayApproveTx });
  console.log(`   Repayment allowance approved: ${repayApproveTx}`);

  console.log('5. Executing repayment...');
  const repayTx = await walletClient.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'repay',
    args: [agreementId, repayTotal],
  });
  const repayReceipt = await publicClient.waitForTransactionReceipt({ hash: repayTx });
  console.log(`   Repayment confirmed: ${repayTx} (Block ${repayReceipt.blockNumber})`);

  mkdirSync(new URL('../evidence/transactions', import.meta.url), { recursive: true });
  mkdirSync(new URL('../evidence/receipts', import.meta.url), { recursive: true });

  const lifecycleEvidence = {
    chainId: 84532,
    contract: contractAddress,
    borrower: account.address,
    agreementId,
    register: {
      transactionHash: registerTx,
      blockNumber: regReceipt.blockNumber.toString(),
      explorer: `https://sepolia.basescan.org/tx/${registerTx}`,
    },
    draw: {
      transactionHash: drawTx,
      blockNumber: drawReceipt.blockNumber.toString(),
      explorer: `https://sepolia.basescan.org/tx/${drawTx}`,
    },
    repay: {
      transactionHash: repayTx,
      blockNumber: repayReceipt.blockNumber.toString(),
      explorer: `https://sepolia.basescan.org/tx/${repayTx}`,
      repaidTotal: repayTotal.toString(),
      complete: true,
    },
    executedAt: new Date().toISOString(),
    status: 'REAL — TESTNET',
  };

  writeFileSync(
    new URL('../evidence/transactions/base-sepolia-lifecycle.json', import.meta.url),
    JSON.stringify(lifecycleEvidence, null, 2),
  );
  console.log('\n[✔] Lifecycle evidence recorded to evidence/transactions/base-sepolia-lifecycle.json');
}

main().catch(console.error);
