import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { issueOffer, authorizeOffer, approvalMessage } from './policy.ts';
import { analyze } from './skills.ts';
import { fixture, hash, CHAIN, DAY, KoraError } from './domain.ts';
import { QUESTION, richGraph, account } from './test-helpers.ts';

const now = Date.now();
const owner = account.address.toLowerCase();
const graph = fixture(now);
const run = analyze(graph, QUESTION, now);
const salt = '0f'.repeat(32);
const offer = issueOffer(graph, run, owner, salt, now);

test('issueOffer computes exact principal and fee', () => {
  // facilityNGN=78.8M kobo, fx 1600: principal = ceil(78.8e6 * 1e6 / 160000)
  assert.equal(offer.principal, '492500000');
  assert.equal(offer.fee, '4925000');
  assert.equal(offer.facilityNGN, 78_800_000);
  assert.equal(offer.chainId, CHAIN);
  assert.equal(offer.token, '0x036cbd53842c5426634e7929541ec2318f3dcf7e');
  assert.equal(offer.status, 'PROPOSED');
  assert.equal(offer.borrower, owner);
  assert.equal(offer.lender, owner);
});

test('issueOffer binds commitments with salt', () => {
  assert.equal(offer.businessCommitment, hash({ salt, business: graph.id }));
  assert.equal(
    offer.obligationCommitment,
    hash({ salt, business: graph.id, purchase: run.question.purchaseId }),
  );
  assert.equal(offer.evidenceCommitment, hash({ salt, run: run.runHash }));
  assert.equal(offer.expiresAt, Math.floor(now / 1000) + 900);
  assert.equal(offer.dueAt, Math.floor(now / 1000) + 30 * DAY / 1000);
});

test('issueOffer denies when policy does', () => {
  const rich = analyze(richGraph(now), QUESTION, now);
  try {
    issueOffer(richGraph(now), rich, owner, salt, now);
    assert.fail('expected POLICY_DENIED');
  } catch (e) {
    assert.equal((e as KoraError).code, 'POLICY_DENIED');
  }
});

test('issueOffer rejects stale and modified runs', () => {
  assert.throws(
    () => issueOffer(graph, run, owner, salt, now + 16 * 60000),
    (e: unknown) => (e as KoraError).code === 'STALE_RUN',
  );
  const tampered = analyze(graph, QUESTION, now);
  tampered.runHash = '0x' + '0'.repeat(64);
  assert.throws(
    () => issueOffer(graph, tampered as never, owner, salt, now),
    (e: unknown) => (e as KoraError).code === 'RUN_MODIFIED',
  );
});

test('authorizeOffer gates wallet and chain', () => {
  assert.throws(
    () => authorizeOffer(offer, graph, '0x' + 'f'.repeat(40), now, CHAIN),
    (e: unknown) => (e as KoraError).code === 'WRONG_WALLET',
  );
  assert.throws(
    () => authorizeOffer(offer, graph, owner, now, 1),
    (e: unknown) => (e as KoraError).code === 'WRONG_CHAIN',
  );
});

test('authorizeOffer gates expiry and evidence', () => {
  const future = (offer.expiresAt + 1) * 1000 + 1;
  assert.throws(
    () => authorizeOffer(offer, graph, owner, future, CHAIN),
    (e: unknown) => (e as KoraError).code === 'EXPIRED_OFFER',
  );
  assert.throws(
    () => authorizeOffer(offer, richGraph(now), owner, now, CHAIN),
    (e: unknown) => (e as KoraError).code === 'EVIDENCE_MODIFIED',
  );
  const stale = fixture(now - DAY - 1);
  stale.asOf = now - DAY - 1;
  assert.throws(
    () => authorizeOffer(offer, stale, owner, now, CHAIN),
    (e: unknown) => (e as KoraError).code === 'EVIDENCE_MODIFIED',
  );
});

test('approvalMessage includes exact terms', () => {
  const msg = approvalMessage(offer, '0xabc'.padEnd(42, '0'));
  assert.match(msg, /Chain: 84532/);
  assert.match(msg, /Contract: 0xabc/);
  assert.match(msg, /Offer: /);
  assert.match(msg, /Run: /);
  assert.match(msg, /Principal USDC atomic units: 492500000/);
  assert.match(msg, /Fee USDC atomic units: 4925000/);
  assert.match(msg, /Policy: kora-demo-policy\/1/);
  assert.match(msg, /Evidence: /);
});