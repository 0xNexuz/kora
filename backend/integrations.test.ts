import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import { MonoBankingAdapter, KotaniPayOffRampAdapter, type BankTransaction } from './integrations.ts';
import { validateGraph, type Graph } from './domain.ts';
import { analyze } from './skills.ts';

test('INTEGRATIONS: Mono banking adapter exchanges token and maps canonical records', async () => {
  const mono = new MonoBankingAdapter();
  const account = await mono.exchangeToken('code_sample_mono_test_123');

  assert.equal(account.accountNumber, '0123456789');
  assert.equal(account.currency, 'NGN');
  assert.equal(account.balanceKobo, 120000000);

  const transactions: BankTransaction[] = [
    {
      id: 'tx-sale-1',
      amountKobo: 2000000,
      type: 'credit',
      narration: 'POS Collection - Pharmacy sales',
      day: 1,
      date: '2026-10-01',
      counterparty: 'Retail Customers'
    },
    {
      id: 'tx-restock-1',
      amountKobo: 140000000,
      type: 'debit',
      narration: 'Supplier transfer - Medicine inventory supplier',
      day: 12,
      date: '2026-10-12',
      counterparty: 'Emzor Pharma Distributor'
    }
  ];

  const records = mono.mapStatementToRecords('adas-pharmacy', account.balanceKobo, transactions);
  assert.equal(records.length, 3);
  assert.equal(records[0].kind, 'opening-cash');
  assert.equal(records[0].amount, 120000000);
  assert.equal(records[1].kind, 'sale');
  assert.equal(records[2].kind, 'inventory');

  // Verify all records have valid evidence hashes
  for (const r of records) {
    assert.ok(r.evidenceHash.startsWith('0x'));
  }
});

test('INTEGRATIONS: Mono webhook signature validation prevents spoofing', () => {
  const mono = new MonoBankingAdapter({ webhookSecret: 'test_secret_key' });
  const payload = { event: 'mono.account_updated', accountId: 'acc_123', balance: 1200000 };

  // Generate valid signature using crypto HMAC
  const validSig = createHmac('sha256', 'test_secret_key').update(JSON.stringify(payload)).digest('hex');

  assert.ok(mono.verifyWebhook(validSig, payload));
  assert.equal(mono.verifyWebhook('invalid_signature_hex', payload), false);
  assert.equal(mono.verifyWebhook('', payload), false);
});

test('INTEGRATIONS: Kotani Pay off-ramp calculates integer kobo payout quote', () => {
  const kotani = new KotaniPayOffRampAdapter();
  const quote = kotani.getQuote('1000000', 1600); // 1 USDC = ₦1,600

  assert.equal(quote.sourceAmountUSDC, '1000000');
  assert.equal(quote.exchangeRateNGN, 1600);
  assert.equal(quote.grossPayoutNGN, 160000); // 160,000 kobo = ₦1,600.00
  assert.equal(quote.netPayoutKobo, 160000);
  assert.ok(quote.expiresAt > Date.now());

  // Negative / invalid amounts fail closed
  assert.throws(() => kotani.getQuote('0'), /INVALID_USDC_AMOUNT/);
  assert.throws(() => kotani.getQuote('-500'), /INVALID_USDC_AMOUNT/);
  assert.throws(() => kotani.getQuote('abc'), /INVALID_USDC_AMOUNT/);
});

test('INTEGRATIONS: Kotani Pay executes NIP payout and verifies callback webhook', async () => {
  const kotani = new KotaniPayOffRampAdapter();
  const quote = kotani.getQuote('1000000', 1600);

  const receipt = await kotani.executePayout(
    {
      quoteId: quote.quoteId,
      transactionHash: '0x665b56237a78caacec1c8396dece4969de5732972851d58e54e7d85a6a6329e3',
      sourceWallet: '0xF6D3809d67238EC39a6350b2D7445B53Ab896BBb',
      beneficiaryBankCode: '058',
      beneficiaryAccountNumber: '0123456789',
      beneficiaryName: "Ada's Pharmacy"
    },
    quote
  );

  assert.equal(receipt.status, 'SETTLED');
  assert.equal(receipt.netPayoutNGN, 1600);
  assert.equal(receipt.channel, 'Nigeria Inter-Bank Settlement System (NIP)');
  assert.ok(receipt.settlementReference.startsWith('KORA-NIP-'));

  // Webhook event verification
  const { payload, signature } = kotani.createWebhookEvent(receipt);
  assert.ok(kotani.verifyWebhook(signature, payload));
  assert.equal(kotani.verifyWebhook('tampered_signature', payload), false);
});

test('INTEGRATIONS: End-to-end sandbox banking to deterministic underwriting to off-ramp', async () => {
  const mono = new MonoBankingAdapter();
  const kotani = new KotaniPayOffRampAdapter();

  // 1. Ingest from bank
  const account = await mono.exchangeToken('auth_sandbox_ada');
  const txs: BankTransaction[] = [
    { id: 'payroll-1', amountKobo: 30000000, type: 'debit', narration: 'Staff payroll', day: 5, date: '2026-10-05', counterparty: 'Staff' },
    { id: 'rent-1', amountKobo: 18000000, type: 'debit', narration: 'Premises rent', day: 8, date: '2026-10-08', counterparty: 'Landlord' },
    { id: 'debt-1', amountKobo: 20000000, type: 'debit', narration: 'Existing microfinance debt', day: 10, date: '2026-10-10', counterparty: 'MFI' },
    { id: 'restock-1', amountKobo: 140000000, type: 'debit', narration: 'Wholesale medicine inventory supplier', day: 12, date: '2026-10-12', counterparty: 'Supplier' },
    { id: 'customer-1', amountKobo: 160000000, type: 'credit', narration: 'Hospital wholesale receivable', day: 20, date: '2026-10-20', counterparty: 'Hospital' }
  ];
  for (let d = 1; d <= 35; d++) {
    txs.push({ id: 'sales-' + d, amountKobo: 2000000, type: 'credit', narration: 'POS sale', day: d, date: '2026-10-' + d, counterparty: 'Walk-in' });
  }

  const records = mono.mapStatementToRecords('adas-pharmacy', account.balanceKobo, txs);
  const now = Date.now();
  const graph: Graph = {
    id: 'adas-pharmacy',
    name: "Ada's Pharmacy (fictional)",
    mode: 'DEMO',
    asOf: now,
    version: 1,
    records,
    history: []
  };

  validateGraph(graph, now);

  // 2. Underwrite
  const run = analyze(graph, {
    question: 'Can I afford this restock order?',
    purchaseId: 'restock-1',
    horizonDays: 35
  }, now);

  assert.equal(run.recommendation.recommendedAction, 'REVIEW_FINANCING');
  assert.ok(run.facilityNGN > 0);

  // 3. Off-ramp simulation for facility amount
  const quote = kotani.getQuote('1000000', 1600);
  const receipt = await kotani.executePayout(
    {
      quoteId: quote.quoteId,
      transactionHash: '0x665b56237a78caacec1c8396dece4969de5732972851d58e54e7d85a6a6329e3',
      sourceWallet: '0xF6D3809d67238EC39a6350b2D7445B53Ab896BBb',
      beneficiaryBankCode: account.bankCode,
      beneficiaryAccountNumber: account.accountNumber,
      beneficiaryName: account.businessName
    },
    quote
  );

  assert.equal(receipt.status, 'SETTLED');
  assert.equal(receipt.recipientAccount, '0123456789');
});
