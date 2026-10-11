import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer as allocatePort } from 'node:net';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import type { Hex, Address } from 'viem';
import ganache from 'ganache';
import { fixture, CHAIN, USDC } from './domain.ts';
import { analyze } from './skills.ts';
import { issueOffer } from './policy.ts';
import { Store } from './store.ts';

let Service: typeof import('./service.ts').Service;

const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex;
const TEST_KEY_OTHER = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as Hex;
const QUESTION = {
  question: 'Can I still place this inventory order?',
  purchaseId: 'restock-1',
  horizonDays: 35,
};

const usdcArtifact = JSON.parse(
  readFileSync(new URL('./artifacts/TestUSDC.json', import.meta.url), 'utf8')
) as { abi: unknown[]; bytecode: Hex; deployedBytecode: Hex };

const facilityArtifact = JSON.parse(
  readFileSync(new URL('./artifacts/KoraFacility.json', import.meta.url), 'utf8')
) as { abi: unknown[]; bytecode: Hex; deployedBytecode: Hex };

let server: ReturnType<typeof ganache.server>;
let chain: typeof import('./chain.ts');
let owner: Address;
let other: Address;
let deployedFacility: Address;
const now = Date.now();

async function rpc(method: string, params: unknown[] = []) {
  return (server.provider.request as (r: { method: string; params: unknown[] }) => Promise<unknown>)({
    method,
    params,
  });
}

async function send(from: Address, data: Hex, to?: Address) {
  const tx = await rpc('eth_sendTransaction', [
    { from, to, data, value: '0x0', gas: '0x989680' },
  ]);
  return tx as Hex;
}

async function mine() {
  await rpc('evm_mine');
}

async function expectRevert(from: Address, data: Hex, to: Address) {
  await assert.rejects(
    async () => {
      await rpc('eth_call', [{ from, to, data }]);
    },
    /revert/i
  );
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

  server = ganache.server({
    logging: { quiet: true },
    chain: { chainId: CHAIN, hardfork: 'shanghai', time: new Date(now) },
    wallet: {
      accounts: [
        { secretKey: TEST_KEY, balance: '0x21e19e0c9bab2400000' },
        { secretKey: TEST_KEY_OTHER, balance: '0x21e19e0c9bab2400000' },
      ],
    },
  } as unknown as Parameters<typeof ganache.server>[0]);

  await server.listen(port, '127.0.0.1');
  process.env.KORA_RPC_URL = `http://127.0.0.1:${port}`;
  chain = await import('./chain.ts');
  Service = (await import('./service.ts')).Service;
  owner = privateKeyToAccount(TEST_KEY).address;
  other = privateKeyToAccount(TEST_KEY_OTHER).address;

  // Set TestUSDC code at USDC address & mint to owner and other
  await rpc('evm_setAccountCode', [USDC, usdcArtifact.deployedBytecode]);
  const mintOwner = encodeFunctionData({
    abi: usdcArtifact.abi,
    functionName: 'mint',
    args: [owner, 1000000000000000000000000000n],
  });
  await send(owner, mintOwner, USDC);
  const mintOther = encodeFunctionData({
    abi: usdcArtifact.abi,
    functionName: 'mint',
    args: [other, 1000000000000000000000000000n],
  });
  await send(owner, mintOther, USDC);
  await mine();

  // Deploy KoraFacility
  const dep = chain.deployment(owner);
  const depTx = await send(owner, dep.data);
  await mine();
  const depVerified = await chain.verifyDeployment(depTx, owner);
  deployedFacility = depVerified.address as Address;
});

after(async () => {
  await server.close();
  delete process.env.KORA_RPC_URL;
});

test('ADVERSARIAL CONTRACT: unauthorized caller cannot register facility', async () => {
  const graph = fixture(now);
  const run = analyze(graph, QUESTION, now);
  const offer = {
    ...issueOffer(graph, run, owner.toLowerCase(), '01'.repeat(32), now),
    status: 'APPROVED' as const,
    contract: deployedFacility,
  };
  const reg = chain.transaction(offer, 'register');

  // other is NOT the lender
  await expectRevert(other, reg.data, deployedFacility);
});

test('ADVERSARIAL CONTRACT: unauthorized caller cannot draw principal', async () => {
  const graph = fixture(now);
  const run = analyze(graph, QUESTION, now);
  const offer = {
    ...issueOffer(graph, run, owner.toLowerCase(), '02'.repeat(32), now),
    status: 'APPROVED' as const,
    contract: deployedFacility,
  };

  // Register legitimately first
  const allowance = chain.transaction(offer, 'allowance');
  await send(owner, allowance.data, USDC);
  await mine();
  const reg = chain.transaction(offer, 'register');
  await send(owner, reg.data, deployedFacility);
  await mine();

  // other attempts to draw (borrower is owner)
  const drawData = encodeFunctionData({
    abi: facilityArtifact.abi,
    functionName: 'draw',
    args: [offer.id as Hex],
  });

  await expectRevert(other, drawData, deployedFacility);
});

test('ADVERSARIAL CONTRACT: duplicate obligation and duplicate business rejected', async () => {
  const graph = fixture(now);
  const run = analyze(graph, QUESTION, now);
  const offer1 = {
    ...issueOffer(graph, run, owner.toLowerCase(), '03'.repeat(32), now),
    status: 'APPROVED' as const,
    contract: deployedFacility,
  };

  // Register first offer
  await send(owner, chain.transaction(offer1, 'allowance').data, USDC);
  await mine();
  await send(owner, chain.transaction(offer1, 'register').data, deployedFacility);
  await mine();

  // Create second offer with duplicate obligation commitment
  const offer2 = {
    ...issueOffer(graph, run, owner.toLowerCase(), '04'.repeat(32), now),
    status: 'APPROVED' as const,
    contract: deployedFacility,
    obligationCommitment: offer1.obligationCommitment,
  };

  await expectRevert(owner, chain.transaction(offer2, 'register').data, deployedFacility);
});

test('ADVERSARIAL CONTRACT: excessive repayment (> principal + fee) rejected', async () => {
  const graph = fixture(now);
  const run = analyze(graph, QUESTION, now);
  const offer = {
    ...issueOffer(graph, run, owner.toLowerCase(), '05'.repeat(32), now),
    status: 'APPROVED' as const,
    contract: deployedFacility,
  };

  // Register and draw
  await send(owner, chain.transaction(offer, 'allowance').data, USDC);
  await mine();
  await send(owner, chain.transaction(offer, 'register').data, deployedFacility);
  await mine();
  await send(owner, chain.transaction({ ...offer, status: 'REGISTERED' }, 'draw').data, deployedFacility);
  await mine();

  const totalDue = BigInt(offer.principal) + BigInt(offer.fee);
  const excessiveAmount = totalDue + 1000000n;

  const repayData = encodeFunctionData({
    abi: facilityArtifact.abi,
    functionName: 'repay',
    args: [offer.id as Hex, excessiveAmount],
  });

  await expectRevert(owner, repayData, deployedFacility);
});

test('ADVERSARIAL CONTRACT: zero amount repayment rejected', async () => {
  const graph = fixture(now);
  const run = analyze(graph, QUESTION, now);
  const offer = {
    ...issueOffer(graph, run, owner.toLowerCase(), '06'.repeat(32), now),
    status: 'APPROVED' as const,
    contract: deployedFacility,
  };

  await send(owner, chain.transaction(offer, 'allowance').data, USDC);
  await mine();
  await send(owner, chain.transaction(offer, 'register').data, deployedFacility);
  await mine();
  await send(owner, chain.transaction({ ...offer, status: 'REGISTERED' }, 'draw').data, deployedFacility);
  await mine();

  const zeroRepay = encodeFunctionData({
    abi: facilityArtifact.abi,
    functionName: 'repay',
    args: [offer.id as Hex, 0n],
  });

  await expectRevert(owner, zeroRepay, deployedFacility);
});

test('ADVERSARIAL CONTRACT: token transfer failure reverts entire registration', async () => {
  const graph = fixture(now);
  const run = analyze(graph, QUESTION, now);
  const offer = {
    ...issueOffer(graph, run, owner.toLowerCase(), '07'.repeat(32), now),
    status: 'APPROVED' as const,
    contract: deployedFacility,
  };

  // Reset allowance to 0
  const revokeAllowance = encodeFunctionData({
    abi: usdcArtifact.abi,
    functionName: 'approve',
    args: [deployedFacility, 0n],
  });
  await send(owner, revokeAllowance, USDC);
  await mine();

  // Register must fail with TRANSFER because allowance is 0
  const regData = chain.transaction(offer, 'register').data;
  await expectRevert(owner, regData, deployedFacility);
});

test('ADVERSARIAL SERVICE: idempotent reconciliation preserves consistent history', async () => {
  const dir = join(tmpdir(), 'kora-test-idempotent-' + Date.now());
  const store = new Store(dir);
  const service = new Service(store, owner, () => now);

  const run = service.run({ question: 'Can I place order?', purchaseId: 'restock-1', horizonDays: 35 });
  const offer = service.offer(run.id);

  // Register deployment in service
  store.insert('deployment', 'active', {
    address: deployedFacility,
    chainId: CHAIN,
    transactionHash: '0xdep' as Hex,
    blockNumber: '1',
    blockHash: '0xb' as Hex,
    explorer: '',
    status: 'REAL — TESTNET',
  });

  // Human approval with valid signature
  const app = service.approval(offer.id);
  const sig = await privateKeyToAccount(TEST_KEY).signMessage({ message: app.message });
  await service.approve(offer.id, sig, CHAIN);

  // Execute on Ganache
  const approvedOffer = service.getOffer(offer.id);
  await send(owner, chain.transaction(approvedOffer, 'allowance').data, USDC);
  await mine();
  const regTx = await send(owner, chain.transaction(approvedOffer, 'register').data, deployedFacility);
  await mine();
  await service.reconcile(offer.id, regTx);

  const registeredOffer = service.getOffer(offer.id);
  const drawTx = await send(owner, chain.transaction(registeredOffer, 'draw').data, deployedFacility);
  await mine();
  await service.reconcile(offer.id, drawTx);

  const drawnOffer = service.getOffer(offer.id);
  const total = (BigInt(drawnOffer.principal) + BigInt(drawnOffer.fee)).toString();
  await send(owner, chain.transaction(drawnOffer, 'allowance').data, USDC);
  await mine();
  const repayTx = await send(owner, chain.transaction(drawnOffer, 'repay', total).data, deployedFacility);
  await mine();

  // 1st reconciliation
  const res1 = await service.reconcile(offer.id, repayTx);
  assert.equal(res1.offer.status, 'REPAID');
  const count1 = res1.graph.history.length;

  // 2nd reconciliation (idempotent retry)
  const res2 = await service.reconcile(offer.id, repayTx);
  assert.equal(res2.offer.status, 'REPAID');
  assert.equal(res2.graph.history.length, count1, 'History must not be duplicated on retry');

  store.close();
  rmSync(dir, { recursive: true, force: true });
});

test('ADVERSARIAL SERVICE: authentication rejects wrong signature and expired challenge', async () => {
  const dir = join(tmpdir(), 'kora-test-auth-' + Date.now());
  const store = new Store(dir);
  let time = now;
  const service = new Service(store, owner, () => time);

  const c = service.challenge();

  // Test expired challenge
  time += 300001;
  await assert.rejects(
    async () => {
      await service.authenticate(c.id, '0x1234' as Hex, CHAIN);
    },
    /INVALID_CHALLENGE/
  );

  // Fresh challenge with wrong signature
  time = now;
  const c2 = service.challenge();
  await assert.rejects(
    async () => {
      // Signature created by 'other' account, not 'owner'
      const otherAccount = privateKeyToAccount(TEST_KEY_OTHER);
      const wrongSig = await otherAccount.signMessage({ message: c2.message });
      await service.authenticate(c2.id, wrongSig, CHAIN);
    },
    /WRONG_WALLET_OR_SIGNATURE/
  );

  store.close();
  rmSync(dir, { recursive: true, force: true });
});

test('ADVERSARIAL STORE: detects audit tampering in hash chain', () => {
  const dir = join(tmpdir(), 'kora-test-tamper-' + Date.now());
  const store = new Store(dir);

  store.audit({ event: 'STEP_1', value: 100 });
  store.audit({ event: 'STEP_2', value: 200 });
  assert.ok(store.verifyAudit());

  // Tamper with SQLite records table directly
  store.db.exec("UPDATE audit SET digest = '0xtampered' WHERE seq = 1;");

  assert.throws(
    () => store.verifyAudit(),
    /AUDIT_TAMPERED/
  );

  store.close();
  rmSync(dir, { recursive: true, force: true });
});
