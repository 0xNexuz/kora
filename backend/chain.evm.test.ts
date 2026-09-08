import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer as allocatePort } from 'node:net';
import { readFileSync } from 'node:fs';
import { privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import type { Hex, Address } from 'viem';
import ganache from 'ganache';
import { fixture, CHAIN, USDC } from './domain.ts';
import { analyze } from './skills.ts';
import { issueOffer } from './policy.ts';

// Mirrors test-helpers constants but WITHOUT importing test-helpers: importing
// it would transitively import service.ts -> chain.ts, which would create the
// module-level rpc with the default (real testnet) URL before we can point it
// at the local ganache instance.
const TEST_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex;
const TEST_KEY_OTHER =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as Hex;
const QUESTION = {
  question: 'Can I still place this inventory order?',
  purchaseId: 'restock-1',
  horizonDays: 35,
};

const usdcArtifact = JSON.parse(
  readFileSync(new URL('./artifacts/TestUSDC.json', import.meta.url), 'utf8'),
) as { abi: unknown[]; bytecode: Hex; deployedBytecode: Hex };

let server: ReturnType<typeof ganache.server>;
let url: string;
let chain: typeof import('./chain.ts');
let owner: Address;
let ownerOther: Address;
const now = Date.now();

async function rpc_p(method: string, params: unknown[] = []) {
  return (server.provider.request as (r: { method: string; params: unknown[] }) => Promise<unknown>)(
    { method, params },
  );
}

async function send(from: Address, data: Hex, to?: Address) {
  const tx = await rpc_p('eth_sendTransaction', [
    { from, to, data, value: '0x0', gas: '0x989680' },
  ]);
  return tx as Hex;
}

async function mine() {
  await rpc_p('evm_mine');
}

before(async () => {
  const port = await new Promise<number>((resolve, reject) => {
    const s = allocatePort();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as { port: number }).port;
      s.close(() => resolve(p));
    });
  });
  const serverOpts = {
    logging: { quiet: true },
    chain: { chainId: CHAIN, hardfork: 'shanghai', time: new Date(now) },
    wallet: {
      accounts: [
        { secretKey: TEST_KEY, balance: '0x21e19e0c9bab2400000' },
        { secretKey: TEST_KEY_OTHER, balance: '0x21e19e0c9bab2400000' },
      ],
    },
  };
  server = ganache.server(serverOpts as unknown as Parameters<typeof ganache.server>[0]);
  await server.listen(port, '127.0.0.1');
  url = `http://127.0.0.1:${port}`;
  process.env.KORA_RPC_URL = url;
  chain = await import('./chain.ts');
  owner = privateKeyToAccount(TEST_KEY).address;
  ownerOther = privateKeyToAccount(TEST_KEY_OTHER).address;
});

after(async () => {
  await server.close();
  delete process.env.KORA_RPC_URL;
});

test('EVM: the full facility lifecycle settles on a private chain', async () => {
  // Plant TestUSDC runtime code at the exact USDC address so the facility's
  // constructor invariant (token.code.length > 0) and verifyDeployment's
  // usdc() === USDC check both hold on the private chain.
  assert.equal(
    await rpc_p('evm_setAccountCode', [USDC, usdcArtifact.deployedBytecode]),
    true,
  );
  const mint = encodeFunctionData({ abi: usdcArtifact.abi, functionName: 'mint', args: [owner, 1000000000000000000000000000n] });
  await send(owner, mint, USDC);
  await mine();

  // Deploy the facility with exactly the data verifyDeployment expects.
  const d = chain.deployment(owner);
  const deployTx = await send(owner, d.data);
  await mine();
  const deployed = await chain.verifyDeployment(deployTx, owner);
  assert.equal(deployed.chainId, CHAIN);
  assert.match(deployed.address, /^0x[a-f0-9]{40}$/);
  assert.equal(deployed.status, 'REAL — TESTNET');

  // A deployment from a different key is rejected as an invalid deployment.
  const other = chain.deployment(ownerOther);
  const otherTx = await send(ownerOther, other.data);
  await mine();
  await assert.rejects(
    () => chain.verifyDeployment(otherTx, owner),
    (e: unknown) => (e as { code: string }).code === 'INVALID_DEPLOYMENT',
  );

  // Build an APPROVED offer pinned to the deployed facility.
  const graph = fixture(now);
  const run = analyze(graph, QUESTION, now);
  const offer: ReturnType<typeof issueOffer> & { status: 'APPROVED'; contract: string } = {
    ...issueOffer(graph, run, owner.toLowerCase(), '0f'.repeat(32), now),
    status: 'APPROVED',
    contract: deployed.address,
  };
  const principal = BigInt(offer.principal);
  const fee = BigInt(offer.fee);

  // Register: approve USDC (lender = owner), then register terms.
  const allowance = chain.transaction(offer, 'allowance');
  await send(owner, allowance.data, allowance.to as Address);
  await mine();
  const register = chain.transaction(offer, 'register');
  const registerTx = await send(owner, register.data, register.to as Address);
  await mine();
  const registered = await chain.verifyReceipt(offer, registerTx);
  assert.equal(registered.event, 'Registered');
  assert.equal(registered.amount, offer.principal);
  assert.equal(registered.complete, false);

  // Draw: mark REGISTERED, publish draw, receive principal to the borrower.
  const drawnOffer = { ...offer, status: 'REGISTERED' as const };
  const draw = chain.transaction(drawnOffer, 'draw');
  const drawTx = await send(owner, draw.data, draw.to as Address);
  await mine();
  const drawn = await chain.verifyReceipt(drawnOffer, drawTx);
  assert.equal(drawn.event, 'Drawn');
  assert.equal(drawn.amount, offer.principal);

  // Repay in two parts: partial then the balance.
  const drawn2 = { ...offer, status: 'DRAWN' as const };
  const part = (principal / 2n).toString();
  const partAllowance = chain.transaction(drawn2, 'allowance');
  await send(owner, partAllowance.data, partAllowance.to as Address);
  await mine();
  const repay1 = chain.transaction(drawn2, 'repay', part);
  const repay1Tx = await send(owner, repay1.data, repay1.to as Address);
  await mine();
  const partial = await chain.verifyReceipt({ ...drawn2, repaid: '0' }, repay1Tx);
  assert.equal(partial.event, 'Repaid');
  assert.equal(partial.amount, part);
  assert.equal(partial.complete, false);

  const remaining = (principal + fee - BigInt(partial.amount)).toString();
  const repay2 = chain.transaction({ ...drawn2, repaid: partial.amount }, 'repay', remaining);
  const repay2Tx = await send(owner, repay2.data, repay2.to as Address);
  await mine();
  const full = await chain.verifyReceipt({ ...drawn2, repaid: partial.amount }, repay2Tx);
  assert.equal(full.event, 'Repaid');
  assert.equal(full.amount, remaining);
  assert.equal(full.complete, true);
  assert.equal(BigInt(full.total), principal + fee);
});

test('EVM: inspectWallet reads balances off the private chain', async () => {
  const w = await chain.inspectWallet(owner);
  assert.equal(w.chainId, CHAIN);
  assert.equal(w.token, USDC);
  assert.ok(BigInt(w.gasWei) > 0n);
  assert.ok(BigInt(w.usdcAtomic) > 0n);
});