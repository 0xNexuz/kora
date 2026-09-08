import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { fixture, money, canonical, hash, rowHash, validateGraph, DAY } from './domain.ts';

test('money bounds', () => {
  assert.equal(money(0), 0);
  assert.equal(money(1e12), 1e12);
  for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1e12 + 1]) {
    assert.throws(() => money(bad), (e: unknown) => (e as Error & {code:string}).code === 'INVALID_MONEY');
  }
});

test('canonical is sorted and deterministic', () => {
  const a = { b: 1, a: { d: 2, c: [3, 1] } };
  const b = { a: { c: [3, 1], d: 2 }, b: 1 };
  assert.equal(canonical(a), canonical(b));
});

test('hash is sha256 over canonical, hex-prefixed', () => {
  const h = hash({ x: 1 });
  assert.match(h, /^0x[0-9a-f]{64}$/);
  assert.equal(h, hash({ x: 1 }));
  assert.notEqual(h, hash({ x: 2 }));
});

test('rowHash excludes evidenceHash', () => {
  const r = fixture().records[0];
  const withHash = { ...r, evidenceHash: 'anything' };
  assert.equal(rowHash(withHash), rowHash(r));
});

test('fixture validates', () => {
  const g = fixture();
  assert.doesNotThrow(() => validateGraph(g, g.asOf));
});

test('validateGraph rejects tampered evidence', () => {
  const g = fixture();
  g.records[1].amount += 1;
  assert.throws(() => validateGraph(g, g.asOf), (e: unknown) => (e as Error & {code:string}).code === 'EVIDENCE_MODIFIED');
});

test('validateGraph rejects stale evidence', () => {
  const g = fixture();
  assert.throws(() => validateGraph(g, g.asOf - DAY - 1), (e: unknown) => (e as Error & {code:string}).code === 'STALE_EVIDENCE');
});

test('validateGraph rejects duplicate invoices', () => {
  const g = fixture();
  const dup = { ...g.records[2], id: 'dup-1' };
  g.records.push(dup);
  assert.throws(() => validateGraph(g, g.asOf), (e: unknown) => (e as Error & {code:string}).code === 'DUPLICATE_INVOICE');
});

test('validateGraph rejects missing kinds', () => {
  const g = fixture();
  g.records = g.records.filter((r) => r.kind !== 'payroll');
  assert.throws(() => validateGraph(g, g.asOf), (e: unknown) => (e as Error & {code:string}).code === 'MISSING_EVIDENCE');
});

test('validateGraph rejects ambiguous opening balance', () => {
  const g = fixture();
  const dup = { ...g.records[0], id: 'bank-opening-2', externalId: 'bank-opening-2' };
  dup.evidenceHash = rowHash(dup);
  g.records.push(dup);
  assert.throws(() => validateGraph(g, g.asOf), (e: unknown) => (e as Error & {code:string}).code === 'AMBIGUOUS_OPENING_BALANCE');
});