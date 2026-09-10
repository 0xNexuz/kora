import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';

import {connectWallet, friendlyError, restoreWallet} from './kora.ts';

const originalWindow = globalThis.window;
const testGlobal = globalThis as typeof globalThis & {window?: Window};

function provide(
  request: (options: {method: string; params?: unknown[]}) => Promise<unknown>,
) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {ethereum: {request}},
  });
}

afterEach(() => {
  if (originalWindow === undefined) {
    delete testGlobal.window;
    return;
  }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

test('public wallet connection accepts any injected account without signing', async () => {
  const calls: string[] = [];
  provide(async ({method}) => {
    calls.push(method);
    if (method === 'eth_requestAccounts') {
      return ['0x1111111111111111111111111111111111111111'];
    }
    if (method === 'eth_chainId') return '0x14a34';
    throw new Error(`Unexpected method: ${method}`);
  });

  assert.deepEqual(await connectWallet(), {
    address: '0x1111111111111111111111111111111111111111',
    chainId: 84532,
  });
  assert.deepEqual(calls, ['eth_requestAccounts', 'eth_chainId']);
});

test('wallet restoration is passive and never prompts the visitor', async () => {
  const calls: string[] = [];
  provide(async ({method}) => {
    calls.push(method);
    if (method === 'eth_accounts') {
      return ['0x2222222222222222222222222222222222222222'];
    }
    if (method === 'eth_chainId') return '0x1';
    throw new Error(`Unexpected method: ${method}`);
  });

  assert.deepEqual(await restoreWallet(), {
    address: '0x2222222222222222222222222222222222222222',
    chainId: 1,
  });
  assert.deepEqual(calls, ['eth_accounts', 'eth_chainId']);
});

test('missing wallet reports an actionable public-demo message', async () => {
  delete testGlobal.window;
  await assert.rejects(connectWallet(), /NO_WALLET/);
  assert.match(friendlyError('NO_WALLET', null), /public demo/i);
});
