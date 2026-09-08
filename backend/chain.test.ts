import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { artifact, terms, deployment, transaction } from './chain.ts';
import { CHAIN, KoraError } from './domain.ts';
import { account } from './test-helpers.ts';
import { issueOffer } from './policy.ts';
import { analyze } from './skills.ts';
import { fixture } from './domain.ts';
import { QUESTION } from './test-helpers.ts';

const now = Date.now();
const graph = fixture(now);
const run = analyze(graph, QUESTION, now);
const owner = account.address.toLowerCase();
const contract = '0x' + 'c'.repeat(40);
const offer = { ...issueOffer(graph, run, owner, '0f'.repeat(32), now), contract };

test('artifact embeds KoraFacility abi and bytecode', () => {
  const a = artifact();
  assert.ok(a.abi.length > 0);
  assert.match(a.bytecode, /^0x[0-9a-f]+$/);
  assert.match(a.deployedBytecode, /^0x[0-9a-f]+$/);
});

test('terms maps commitments and money to on-chain types', () => {
  const t = terms(offer);
  assert.equal(t.id, offer.id);
  assert.equal(t.business, offer.businessCommitment);
  assert.equal(t.obligation, offer.obligationCommitment);
  assert.equal(t.evidence, offer.evidenceCommitment);
  assert.equal(t.borrower.toLowerCase(), owner);
  assert.equal(t.principal, BigInt(offer.principal));
  assert.equal(t.fee, BigInt(offer.fee));
});

test('deployment encodes constructor args', () => {
  const d = deployment(owner);
  assert.equal(d.from, owner);
  assert.equal(d.chainId, CHAIN);
  assert.equal(d.value, '0x0');
  assert.match(d.data, /^0x[0-9a-f]+$/);
});

test('transaction requires a deployed contract', () => {
  const undeployed = { ...offer, contract: null };
  assert.throws(
    () => transaction(undeployed, 'register'),
    (e: unknown) => (e as KoraError).code === 'CONTRACT_NOT_DEPLOYED',
  );
});

test('transaction encodes allowance, register, draw', () => {
  const registered = { ...offer, contract };
  const allowance = transaction(registered, 'allowance');
  assert.equal(allowance.to, offer.token);
  assert.match(allowance.data, /^0x[0-9a-f]+$/);
  assert.equal(allowance.value, '0x0');

  const approved = { ...offer, status: 'APPROVED' as const };
  const register = transaction(approved, 'register');
  assert.equal(register.to, contract);
  assert.match(register.data, /^0x[0-9a-f]+$/);

  const drawn = { ...offer, status: 'REGISTERED' as const };
  const draw = transaction(drawn, 'draw');
  assert.equal(draw.to, contract);
  assert.match(draw.data, /^0x[0-9a-f]+$/);
});

test('transaction enforces state transitions', () => {
  assert.throws(
    () => transaction({ ...offer, contract }, 'register'),
    (e: unknown) => (e as KoraError).code === 'HUMAN_APPROVAL_REQUIRED',
  );
  assert.throws(
    () => transaction({ ...offer, contract, status: 'APPROVED' as const }, 'draw'),
    (e: unknown) => (e as KoraError).code === 'INVALID_STATE',
  );
  assert.throws(
    () => transaction({ ...offer, contract, status: 'REGISTERED' as const }, 'repay'),
    (e: unknown) => (e as KoraError).code === 'INVALID_STATE',
  );
});

test('repay encodes and validates amounts', () => {
  const drawn = { ...offer, status: 'DRAWN' as const };
  const repay = transaction(drawn, 'repay', '1000000');
  assert.match(repay.data, /^0x[0-9a-f]+$/);
  assert.throws(
    () => transaction(drawn, 'repay', '0'),
    (e: unknown) => (e as KoraError).code === 'INVALID_AMOUNT',
  );
  const tooMuch = (BigInt(offer.principal) + BigInt(offer.fee) + 1n).toString();
  assert.throws(
    () => transaction(drawn, 'repay', tooMuch),
    (e: unknown) => (e as KoraError).code === 'EXCESSIVE_REPAYMENT',
  );
});