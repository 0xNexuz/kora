import { createHash, randomBytes } from 'node:crypto';
import type { RecordRow } from './types.ts';

export class KoraSDKError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export function ensure(value: unknown, code: string): asserts value {
  if (!value) {
    throw new KoraSDKError(code);
  }
}

export const POLICY = 'kora-demo-policy/1';
export const DEFAULT_CHAIN = 84532;
export const DEFAULT_USDC = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
export const DEFAULT_FACILITY = '0xad177afed1593291d872cfe2b3ac984f9cc3febb';
export const DAY_MS = 86400000;

export function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') {
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    return '[' + v.map(canonical).join(',') + ']';
  }
  return (
    '{' +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonical((v as Record<string, unknown>)[k]))
      .join(',') +
    '}'
  );
}

export function hash(v: unknown): string {
  return '0x' + createHash('sha256').update(canonical(v)).digest('hex');
}

export function money(v: unknown): number {
  ensure(typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 1e12, 'INVALID_MONEY');
  return v;
}

export function rowHash(r: Omit<RecordRow, 'evidenceHash'> | RecordRow): string {
  const { evidenceHash: _, ...rest } = r as RecordRow;
  return hash(rest);
}

export function createSalt(): string {
  return '0x' + randomBytes(32).toString('hex');
}
