import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';
import type { Address, Hex } from 'viem';
import { Store } from './store.ts';
import { Service } from './service.ts';
import { rowHash } from './domain.ts';
import type { Graph, RecordRow, Question } from './domain.ts';

// Deterministic test wallet (Anvil/Hardhat key #0). Never a real fund.
export const TEST_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex;
export const account = privateKeyToAccount(TEST_KEY);
// Anvil key #1 — used to prove a different signer is rejected.
export const TEST_KEY_OTHER =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as Hex;
export const accountOther = privateKeyToAccount(TEST_KEY_OTHER);

export function tempStore() {
  const dir = mkdtempSync(join(tmpdir(), 'kora-test-'));
  const store = new Store(dir);
  const close = () => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  };
  return { dir, store, close };
}

export function makeService(clock: () => number = Date.now, owner: Address = account.address) {
  const t = tempStore();
  const service = new Service(t.store, owner, clock);
  return { ...t, service, owner };
}

export function record(
  id: string,
  kind: RecordRow['kind'],
  naira: number,
  day: number,
  counterparty: string,
  asOf: number,
): RecordRow {
  const r: RecordRow = {
    id,
    businessId: 'adas-pharmacy',
    sourceId: 'fictional-fixture/v1',
    externalId: id,
    kind,
    amount: naira * 100,
    day,
    counterparty,
    mode: 'DEMO',
    recordedAt: asOf,
    evidenceHash: '',
    status: kind === 'opening-cash' ? 'observed' : 'expected',
  };
  r.evidenceHash = rowHash(r);
  return r;
}

// A valid graph that never needs financing (huge opening cash) so
// analyze() must conclude REDUCE_ORDER / facilityNGN === 0.
export function richGraph(asOf = Date.now()): Graph {
  const add = (
    id: string,
    kind: RecordRow['kind'],
    naira: number,
    day: number,
    counterparty: string,
  ) => record(id, kind, naira, day, counterparty, asOf);
  return {
    id: 'adas-pharmacy',
    name: "Ada's Pharmacy (fictional)",
    mode: 'DEMO',
    asOf,
    version: 1,
    records: [
      add('bank-opening', 'opening-cash', 5_000_000_000, 0, 'Fictional bank statement'),
      ...Array.from({ length: 35 }, (_, i) =>
        add('sales-' + (i + 1), 'sale', 20000, i + 1, 'Expected pharmacy sales'),
      ),
      add('payroll-1', 'payroll', 300000, 5, 'Staff'),
      add('rent-1', 'expense', 180000, 8, 'Premises'),
      add('debt-1', 'debt', 200000, 10, 'Existing debt'),
      add('restock-1', 'inventory', 1400000, 12, 'Fictional medicine supplier'),
      add('customer-1', 'receivable', 1600000, 20, 'Fictional wholesale customer'),
    ],
    history: [],
  };
}

export const QUESTION: Question = {
  question: 'Can I still place this inventory order?',
  purchaseId: 'restock-1',
  horizonDays: 35,
};