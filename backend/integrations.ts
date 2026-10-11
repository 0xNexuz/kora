import { createHmac, randomBytes } from 'node:crypto';
import { ensure, hash, rowHash, money, type RecordRow, type Kind } from './domain.ts';

// ============================================================================
// 1. OPEN BANKING / ERP INTEGRATION ADAPTER (Mono / Flutterwave Sandbox)
// ============================================================================

export interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  currency: string;
  balanceKobo: number;
  businessName: string;
}

export interface BankTransaction {
  id: string;
  amountKobo: number;
  type: 'credit' | 'debit';
  narration: string;
  day: number;
  date: string;
  counterparty: string;
}

export interface MonoWebhookPayload {
  event: 'mono.account_updated' | 'mono.statement_ready';
  data: {
    accountId: string;
    accountNumber: string;
    transactions: BankTransaction[];
    timestamp: number;
  };
}

export class MonoBankingAdapter {
  private secretKey: string;
  private webhookSecret: string;

  constructor(opts?: { secretKey?: string; webhookSecret?: string }) {
    this.secretKey = opts?.secretKey ?? 'mono_sec_test_kora_sandbox_9a8b7c';
    this.webhookSecret = opts?.webhookSecret ?? 'whsec_kora_mono_sandbox_3d2e1f';
  }

  /**
   * Exchanges an authorization code for an authenticated institution account
   */
  async exchangeToken(authCode: string): Promise<BankAccount> {
    ensure(typeof authCode === 'string' && authCode.length > 0, 'INVALID_AUTH_CODE');
    return {
      id: 'mono_acc_' + hash(authCode).slice(2, 14),
      accountNumber: '0123456789',
      bankName: 'Guaranty Trust Bank (Sandbox)',
      bankCode: '058',
      currency: 'NGN',
      balanceKobo: 120000000, // ₦1,200,000.00
      businessName: "Ada's Pharmacy"
    };
  }

  /**
   * Ingests bank statement feed and maps into tamper-evident canonical Kora RecordRows
   */
  mapStatementToRecords(businessId: string, openingBalanceKobo: number, transactions: BankTransaction[], now = Date.now()): RecordRow[] {
    money(openingBalanceKobo);
    const records: RecordRow[] = [];

    // 1. Opening balance record
    const opening: RecordRow = {
      id: 'bank-opening',
      businessId,
      sourceId: 'fictional-fixture/v1',
      externalId: 'mono-opening-' + businessId,
      kind: 'opening-cash',
      amount: openingBalanceKobo,
      day: 0,
      counterparty: 'GTBank Statement Opening Balance',
      mode: 'DEMO',
      recordedAt: now,
      evidenceHash: '',
      status: 'observed'
    };
    opening.evidenceHash = rowHash(opening);
    records.push(opening);

    // 2. Map categorized statement transactions
    for (const tx of transactions) {
      money(tx.amountKobo);
      let kind: Kind = tx.type === 'credit' ? 'sale' : 'expense';

      const lower = tx.narration.toLowerCase();
      if (lower.includes('medicine') || lower.includes('inventory') || lower.includes('supplier')) {
        kind = 'inventory';
      } else if (lower.includes('receivable') || (lower.includes('wholesale') && tx.type === 'credit')) {
        kind = 'receivable';
      } else if (lower.includes('staff') || lower.includes('salary') || lower.includes('payroll')) {
        kind = 'payroll';
      } else if (lower.includes('rent') || lower.includes('premises')) {
        kind = 'expense';
      } else if (lower.includes('loan') || lower.includes('debt')) {
        kind = 'debt';
      }

      const row: RecordRow = {
        id: tx.id,
        businessId,
        sourceId: 'fictional-fixture/v1',
        externalId: 'mono-tx-' + tx.id,
        kind,
        amount: tx.amountKobo,
        day: tx.day,
        counterparty: tx.counterparty,
        mode: 'DEMO',
        recordedAt: now,
        evidenceHash: '',
        status: tx.type === 'credit' ? 'observed' : 'expected'
      };
      row.evidenceHash = rowHash(row);
      records.push(row);
    }

    return records;
  }

  /**
   * Verifies incoming webhook HMAC-SHA256 signature
   */
  verifyWebhook(signature: string, payload: unknown): boolean {
    if (!signature) return false;
    const computed = createHmac('sha256', this.webhookSecret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return computed.toLowerCase() === signature.toLowerCase();
  }
}

// ============================================================================
// 2. FIAT / USDC OFF-RAMP SETTLEMENT ADAPTER (Kotani Pay / Yellow Card Sandbox)
// ============================================================================

export interface OffRampQuote {
  quoteId: string;
  sourceAmountUSDC: string; // Atomic 6-decimal units, e.g. "1000000" = 1 USDC
  exchangeRateNGN: number;  // 1600 NGN per USDC
  grossPayoutNGN: number;   // Gross NGN (kobo)
  feeKobo: number;          // 0 fee or flat fee
  netPayoutKobo: number;    // Net NGN deposited (kobo)
  expiresAt: number;
}

export interface OffRampPayoutRequest {
  quoteId: string;
  transactionHash: string;
  sourceWallet: string;
  beneficiaryBankCode: string;
  beneficiaryAccountNumber: string;
  beneficiaryName: string;
}

export interface OffRampReceipt {
  payoutId: string;
  settlementReference: string;
  nipSessionId: string;
  transactionHash: string;
  sourceAmountUSDC: string;
  netPayoutNGN: number; // in Naira (for display)
  netPayoutKobo: number;
  recipientAccount: string;
  recipientBank: string;
  timestamp: number;
  status: 'SETTLED' | 'PENDING' | 'FAILED';
  network: 'Base Sepolia (84532)';
  channel: 'Nigeria Inter-Bank Settlement System (NIP)';
}

export class KotaniPayOffRampAdapter {
  private apiKey: string;
  private webhookSecret: string;

  constructor(opts?: { apiKey?: string; webhookSecret?: string }) {
    this.apiKey = opts?.apiKey ?? 'kotani_test_sandbox_api_key_44a2';
    this.webhookSecret = opts?.webhookSecret ?? 'whsec_kotani_offramp_88b1';
  }

  /**
   * Fetches an executable FX and payout quote for USDC to NGN
   */
  getQuote(amountUSDCAtomic: string, rate = 1600): OffRampQuote {
    ensure(typeof amountUSDCAtomic === 'string' && /^[1-9][0-9]*$/.test(amountUSDCAtomic), 'INVALID_USDC_AMOUNT');
    const usdcUnits = Number(BigInt(amountUSDCAtomic) / 1000000n);
    const grossPayoutNGN = usdcUnits * rate;
    const grossKobo = grossPayoutNGN * 100;
    const feeKobo = 0; // zero offramp fee for demo

    return {
      quoteId: 'quote_' + randomBytes(12).toString('hex'),
      sourceAmountUSDC: amountUSDCAtomic,
      exchangeRateNGN: rate,
      grossPayoutNGN: grossKobo,
      feeKobo,
      netPayoutKobo: grossKobo - feeKobo,
      expiresAt: Date.now() + 600000 // 10 minutes
    };
  }

  /**
   * Dispatches instant off-ramp settlement against verified onchain Base Sepolia USDC transfer
   */
  async executePayout(req: OffRampPayoutRequest, quote: OffRampQuote, now = Date.now()): Promise<OffRampReceipt> {
    ensure(req.transactionHash && req.transactionHash.startsWith('0x'), 'INVALID_TRANSACTION_HASH');
    ensure(req.beneficiaryAccountNumber.length === 10, 'INVALID_NUBAN_ACCOUNT');
    ensure(now <= quote.expiresAt, 'QUOTE_EXPIRED');

    const payoutId = 'payout_' + hash(req.transactionHash + req.beneficiaryAccountNumber).slice(2, 14);
    const nipSessionId = '999' + Date.now().toString().slice(-9) + '00001';

    return {
      payoutId,
      settlementReference: 'KORA-NIP-' + randomBytes(6).toString('hex').toUpperCase(),
      nipSessionId,
      transactionHash: req.transactionHash,
      sourceAmountUSDC: quote.sourceAmountUSDC,
      netPayoutNGN: quote.netPayoutKobo / 100,
      netPayoutKobo: quote.netPayoutKobo,
      recipientAccount: req.beneficiaryAccountNumber,
      recipientBank: req.beneficiaryBankCode,
      timestamp: now,
      status: 'SETTLED',
      network: 'Base Sepolia (84532)',
      channel: 'Nigeria Inter-Bank Settlement System (NIP)'
    };
  }

  /**
   * Generates verifiable webhook callback payload for NIP transfer completion
   */
  createWebhookEvent(receipt: OffRampReceipt) {
    const payload = {
      event: 'payout.success',
      data: receipt,
      sentAt: Date.now()
    };
    const signature = createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return { payload, signature };
  }

  /**
   * Validates webhook signature
   */
  verifyWebhook(signature: string, payload: unknown): boolean {
    if (!signature) return false;
    const computed = createHmac('sha256', this.webhookSecret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return computed.toLowerCase() === signature.toLowerCase();
  }
}
