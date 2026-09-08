import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { makeService, QUESTION, account, accountOther } from './test-helpers.ts';
import { CHAIN, KoraError } from './domain.ts';

test('service seeds the demo graph and audit chain', () => {
  const t = makeService();
  try {
    const g = t.service.graph();
    assert.equal(g.id, 'adas-pharmacy');
    assert.equal(t.store.verifyAudit().length, 66);
  } finally { t.close(); }
});

test('challenge/authenticate round trip', async () => {
  const t = makeService();
  try {
    const c = t.service.challenge();
    assert.match(c.message, /Nonce: /);
    assert.ok(c.expiresAt > Date.now());
    const sig = await account.signMessage({ message: c.message });
    const s = await t.service.authenticate(c.id, sig, CHAIN);
    assert.ok(s.token.length === 64);
    assert.ok(t.service.session(s.token)?.expiresAt > Date.now());
  } finally { t.close(); }
});

test('authenticate rejects wrong chain, wrong signer, and replay', async () => {
  const t = makeService();
  try {
    const c = t.service.challenge();
    const wrongSig = await accountOther.signMessage({ message: c.message });
    await assert.rejects(
      t.service.authenticate(c.id, wrongSig, 1),
      (e: unknown) => (e as KoraError).code === 'WRONG_CHAIN',
    );
    await assert.rejects(
      t.service.authenticate(c.id, wrongSig, CHAIN),
      (e: unknown) => (e as KoraError).code === 'WRONG_WALLET_OR_SIGNATURE',
    );
    const sig = await account.signMessage({ message: c.message });
    const s = await t.service.authenticate(c.id, sig, CHAIN);
    assert.ok(s.token);
    await assert.rejects(
      t.service.authenticate(c.id, sig, CHAIN),
      (e: unknown) => (e as KoraError).code === 'INVALID_CHALLENGE',
    );
  } finally { t.close(); }
});

test('session rejects unknown or expired tokens', async () => {
  let now = Date.now();
  const t = makeService(() => now);
  try {
    const c = t.service.challenge();
    const sig = await account.signMessage({ message: c.message });
    const s = await t.service.authenticate(c.id, sig, CHAIN);
    assert.throws(() => t.service.session('bogus'), (e: unknown) => (e as KoraError).code === 'UNAUTHORIZED');
    assert.doesNotThrow(() => t.service.session(s.token));
    now += 3600000 + 1;
    assert.throws(() => t.service.session(s.token), (e: unknown) => (e as KoraError).code === 'UNAUTHORIZED');
  } finally { t.close(); }
});

test('run stores a deterministic analysis', () => {
  const now = Date.now();
  const t = makeService(() => now);
  try {
    const r1 = t.service.run({ ...QUESTION });
    const r2 = t.service.run({ ...QUESTION });
    assert.equal(r1.id, r2.id);
    assert.equal(r1.runHash, r2.runHash);
    assert.equal(t.store.list('run').length, 1);
  } finally { t.close(); }
});

test('run rejects hallucinated intent', () => {
  const t = makeService();
  try {
    assert.throws(
      () => t.service.run({ ...QUESTION, extra: 1 }),
      (e: unknown) => (e as KoraError).code === 'HALLUCINATED_OR_UNAUTHORIZED_FIELDS',
    );
  } finally { t.close(); }
});

test('offer flow requires an approved prior state', async () => {
  const t = makeService();
  try {
    const r = t.service.run({ ...QUESTION });
    const o = t.service.offer(r.id);
    assert.equal(o.status, 'PROPOSED');
    // Duplicate financing is denied while an offer is outstanding.
    assert.throws(
      () => t.service.offer(r.id),
      (e: unknown) => (e as KoraError).code === 'DUPLICATE_FINANCING',
    );
    // Approval requires a registered deployment first.
    assert.throws(
      () => t.service.approval(o.id),
      (e: unknown) => (e as KoraError).code === 'DEPLOYMENT_REQUIRED',
    );
  } finally { t.close(); }
});

test('approve transitions offer through to signing message', async () => {
  const t = makeService();
  try {
    const r = t.service.run({ ...QUESTION });
    const o = t.service.offer(r.id);
    // Simulate a verified deployment recorded in the store.
    t.store.insert('deployment', 'active', { chainId: CHAIN, address: '0x' + 'c'.repeat(40), transactionHash: '0x' + 'd'.repeat(64), blockNumber: '1', blockHash: '0x' + 'e'.repeat(64) });
    const a = t.service.approval(o.id);
    assert.match(a.message, /Contract: 0x/);
    assert.equal(a.contract, '0x' + 'c'.repeat(40));
    const sig = await account.signMessage({ message: a.message });
    const updated = await t.service.approve(o.id, sig, CHAIN);
    assert.equal(updated.status, 'APPROVED');
    assert.equal(updated.contract, a.contract);
  } finally { t.close(); }
});

test('prepare gates on human approval and offer state', () => {
  const t = makeService();
  try {
    const r = t.service.run({ ...QUESTION });
    const o = t.service.offer(r.id);
    assert.throws(
      () => t.service.prepare(o.id, 'register'),
      (e: unknown) => (e as KoraError).code === 'HUMAN_APPROVAL_REQUIRED',
    );
    // Unknown offer ids are rejected.
    assert.throws(
      () => t.service.prepare('0x' + '0'.repeat(64), 'register'),
      (e: unknown) => (e as KoraError).code === 'OFFER_NOT_FOUND',
    );
  } finally { t.close(); }
});