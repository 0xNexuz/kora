import { ensure, money, hash, rowHash, POLICY, DAY_MS } from './crypto.ts';
import type {
  Graph,
  RecordRow,
  Question,
  Scenario,
  Forecast,
  SkillContext,
  SkillResult,
  Run,
  Kind,
} from './types.ts';

export const BASE_SCENARIO: Scenario = {
  name: 'baseline',
  salesBps: 10000,
  invoiceDelayDays: 0,
  purchaseBps: 10000,
  purchaseDelayDays: 0,
  facility: 0,
  repay: 0,
  repayDay: 30,
};

const OUTFLOW_KINDS = new Set<Kind>(['payroll', 'expense', 'debt', 'inventory', 'repayment']);

export function validateGraph(g: Graph, now = Date.now()): void {
  ensure(g.id && typeof g.id === 'string', 'UNSUPPORTED_BUSINESS');
  ensure(
    Number.isSafeInteger(g.asOf) && g.asOf <= now && now - g.asOf <= DAY_MS,
    'STALE_EVIDENCE'
  );
  ensure(g.records.length > 0 && g.records.length <= 1000, 'MISSING_EVIDENCE');

  const ids = new Set<string>();
  const external = new Set<string>();

  for (const r of g.records) {
    ensure(r.businessId === g.id && r.mode === g.mode, 'CROSS_BUSINESS_EVIDENCE');
    ensure(!ids.has(r.id) && !external.has(r.sourceId + ':' + r.externalId), 'DUPLICATE_INVOICE');
    ids.add(r.id);
    external.add(r.sourceId + ':' + r.externalId);
    money(r.amount);
    ensure(Number.isInteger(r.day) && r.day >= 0 && r.day <= 365, 'INVALID_DATE');
    ensure(r.recordedAt <= now && now - r.recordedAt <= DAY_MS, 'STALE_EVIDENCE');
    ensure(rowHash(r) === r.evidenceHash, 'EVIDENCE_MODIFIED');
    ensure(
      [
        'opening-cash',
        'sale',
        'receivable',
        'payroll',
        'expense',
        'debt',
        'inventory',
        'repayment',
      ].includes(r.kind),
      'UNSUPPORTED_EVIDENCE'
    );
  }

  for (const kind of ['opening-cash', 'sale', 'receivable', 'payroll', 'expense', 'debt', 'inventory']) {
    ensure(
      g.records.some((r) => r.kind === kind),
      'MISSING_EVIDENCE'
    );
  }

  ensure(
    g.records.filter((r) => r.kind === 'opening-cash').length === 1,
    'AMBIGUOUS_OPENING_BALANCE'
  );
}

export function createDemoFixture(asOf = Date.now()): Graph {
  const g: Graph = {
    id: 'adas-pharmacy',
    name: "Ada's Pharmacy (fictional)",
    mode: 'DEMO',
    asOf,
    version: 1,
    records: [],
    history: [],
  };

  const add = (id: string, kind: Kind, naira: number, day: number, counterparty: string) => {
    const r: RecordRow = {
      id,
      businessId: g.id,
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
    g.records.push(r);
  };

  add('bank-opening', 'opening-cash', 1200000, 0, 'Fictional bank statement');
  for (let d = 1; d <= 35; d++) {
    add('sales-' + d, 'sale', 20000, d, 'Expected pharmacy sales');
  }
  add('payroll-1', 'payroll', 300000, 5, 'Staff');
  add('rent-1', 'expense', 180000, 8, 'Premises');
  add('debt-1', 'debt', 200000, 10, 'Existing debt');
  add('restock-1', 'inventory', 1400000, 12, 'Fictional medicine supplier');
  add('customer-1', 'receivable', 1600000, 20, 'Fictional wholesale customer');

  return g;
}

export function forecast(ctx: SkillContext, s: Scenario): Forecast {
  validateGraph(ctx.graph, ctx.now);
  ensure(
    Number.isInteger(ctx.question.horizonDays) &&
      ctx.question.horizonDays >= 30 &&
      ctx.question.horizonDays <= 35,
    'INVALID_HORIZON'
  );
  for (const v of [s.salesBps, s.purchaseBps]) {
    ensure(Number.isInteger(v) && v >= 0 && v <= 10000, 'INVALID_SCENARIO');
  }
  for (const v of [s.invoiceDelayDays, s.purchaseDelayDays, s.repayDay]) {
    ensure(Number.isInteger(v) && v >= 0 && v <= 35, 'INVALID_SCENARIO');
  }
  money(s.facility);
  money(s.repay);

  let cash = ctx.graph.records.find((r) => r.kind === 'opening-cash')!.amount;
  const daily: Forecast['daily'] = [];

  for (let day = 1; day <= ctx.question.horizonDays; day++) {
    let inflow = day === 1 ? s.facility : 0;
    let outflow = day === s.repayDay ? s.repay : 0;
    const refs: string[] = [];

    for (const r of ctx.graph.records) {
      let due = r.day;
      let amount = r.amount;
      if (r.kind === 'receivable') due += s.invoiceDelayDays;
      if (r.kind === 'sale') amount = Math.floor((amount * s.salesBps) / 10000);
      if (r.id === ctx.question.purchaseId) {
        due += s.purchaseDelayDays;
        amount = Math.floor((amount * s.purchaseBps) / 10000);
      }
      if (due !== day || r.kind === 'opening-cash') continue;
      refs.push(r.id);
      if (OUTFLOW_KINDS.has(r.kind)) outflow += amount;
      else inflow += amount;
    }

    const opening = cash;
    cash += inflow - outflow;
    ensure(Number.isSafeInteger(cash), 'MONEY_OVERFLOW');
    daily.push({ day, opening, inflow, outflow, closing: cash, evidenceRefs: refs });
  }

  const minimum = Math.min(...daily.map((d) => d.closing));
  return {
    name: s.name,
    daily,
    minimum,
    deficit: Math.max(0, -minimum),
    firstDeficitDay: daily.find((d) => d.closing < 0)?.day ?? null,
    ending: cash,
  };
}

function result<T>(
  skill: string,
  ctx: SkillContext,
  output: T,
  assumptions: string[] = [],
  calculations: string[] = []
): SkillResult<T> {
  validateGraph(ctx.graph, ctx.now);
  return {
    skill,
    version: '1.0.0',
    status: 'REAL — LOCAL',
    dataMode: ctx.graph.mode,
    evidenceRefs: ctx.graph.records.map((r) => r.id),
    assumptions,
    calculations,
    output,
  };
}

const sum = (ctx: SkillContext, kinds: Kind[]) =>
  ctx.graph.records.filter((r) => kinds.includes(r.kind)).reduce((n, r) => n + r.amount, 0);

export const cashFlowAnalysis = (c: SkillContext) =>
  result('cash-flow-analysis', c, {
    available: sum(c, ['opening-cash']),
    currency: 'NGN',
    unit: 'kobo',
    expectedSales: sum(c, ['sale']),
    receivables: sum(c, ['receivable']),
    obligations: sum(c, ['payroll', 'expense', 'debt', 'inventory']),
  });

export const cashFlowForecast = (c: SkillContext) =>
  result(
    'cash-flow-forecast',
    c,
    forecast(c, BASE_SCENARIO),
    [
      'Daily projected sales are fictional assumptions, not observed revenue.',
      'All money is integer kobo. Inflows/outflows are daily netted; intraday timing is not modeled.',
    ]
  );

export const scenarioAnalysis = (c: SkillContext) =>
  result(
    'scenario-analysis',
    c,
    [
      BASE_SCENARIO,
      { ...BASE_SCENARIO, name: 'invoice-delayed', invoiceDelayDays: 7 },
      { ...BASE_SCENARIO, name: 'sales-down-20-percent', salesBps: 8000 },
      { ...BASE_SCENARIO, name: 'combined-adverse', salesBps: 8000, invoiceDelayDays: 7 },
      {
        ...BASE_SCENARIO,
        name: 'delay-inventory',
        purchaseDelayDays: 16,
        invoiceDelayDays: 7,
        salesBps: 8000,
      },
      {
        ...BASE_SCENARIO,
        name: 'smaller-order',
        purchaseBps: 5000,
        salesBps: 8000,
        invoiceDelayDays: 7,
      },
    ].map((s) => forecast(c, s)),
    [
      'Delayed purchase requires supplier consent and inventory availability review.',
      'A smaller order may reduce stock availability. Revenue effect is not modeled.',
    ]
  );

export const receivablesAnalysis = (c: SkillContext) =>
  result('receivables-analysis', c, {
    total: sum(c, ['receivable']),
    items: c.graph.records.filter((r) => r.kind === 'receivable'),
    overdue: c.graph.records.filter((r) => r.kind === 'receivable' && r.day === 0),
  });

export const invoiceAnalysis = (c: SkillContext) =>
  result('invoice-analysis', c, {
    purchase: c.graph.records.find((r) => r.id === c.question.purchaseId),
    integrity: 'hash-verified',
    duplicateCount: 0,
  });

export const supplierAnalysis = (c: SkillContext) =>
  result('supplier-analysis', c, {
    items: c.graph.records.filter((r) => r.kind === 'inventory'),
    delayConsent: 'NOT_VERIFIED',
    mustReviewStockout: true,
  });

export const reconciliation = (c: SkillContext) =>
  result(
    'reconciliation',
    c,
    {
      receipts: c.graph.history.map((h) => ({
        receiptId: h.receiptId,
        transactionHash: h.transactionHash,
        chainId: h.chainId,
      })),
      unmatchedExpectedRecords: c.graph.records
        .filter((r) => r.status === 'expected')
        .map((r) => r.id),
    },
    ['Expected bank/supplier records are not marked settled by a USDC repayment.']
  );

export const workingCapital = (c: SkillContext) => {
  const base = forecast(c, BASE_SCENARIO);
  const stress = forecast(c, {
    ...BASE_SCENARIO,
    name: 'combined-adverse',
    salesBps: 8000,
    invoiceDelayDays: 7,
  });
  const reserve = 10000000;
  const facility = stress.deficit ? stress.deficit + reserve : 0;
  const fee = Math.ceil(facility / 100);
  const funded = forecast(c, {
    ...BASE_SCENARIO,
    name: 'cash-plus-smaller-facility',
    salesBps: 8000,
    invoiceDelayDays: 7,
    facility,
    repay: facility + fee,
  });
  const purchase = c.graph.records.find((r) => r.id === c.question.purchaseId);
  const purchaseAmount = purchase ? purchase.amount : 0;

  return result(
    'working-capital',
    c,
    {
      baseDeficit: base.deficit,
      stressDeficit: stress.deficit,
      reserve,
      facility,
      fee,
      funded,
      eligible: facility > 0 && facility < purchaseAmount && funded.minimum >= reserve,
    },
    [
      '1% flat demo fee, due day 30. No market pricing claim.',
      'Assumes USDC can be converted and applied before inventory is due; actual NGN off-ramp is not implemented.',
    ],
    [
      'facility = stressed liquidity deficit + 100000 NGN reserve',
      'fee = ceil(facility / 100)',
      'Eligibility requires stressed post-repayment cash to stay above reserve.',
    ]
  );
};

export const treasuryMonitor = (c: SkillContext) =>
  result('treasury-monitor', c, {
    cashNGN: sum(c, ['opening-cash']),
    USDC: 'NOT_OBSERVED',
    fx: 'EXPLICIT_DEMO_RATE_REQUIRED',
  });

export const obligationAnalysis = (c: SkillContext) =>
  result('obligation-analysis', c, {
    total: sum(c, ['payroll', 'expense', 'debt', 'inventory']),
    items: c.graph.records.filter((r) => OUTFLOW_KINDS.has(r.kind)),
  });

export const repaymentAnalysis = (c: SkillContext) =>
  result(
    'repayment-analysis',
    c,
    {
      count: c.graph.history.length,
      onTime: c.graph.history.filter((r) => r.onTime).length,
      history: c.graph.history,
      score: 'NOT_SCORED',
    },
    ['Testnet self-funded repayment does not establish real creditworthiness.']
  );

export const financialReport = (c: SkillContext) =>
  result('financial-report', c, {
    today: cashFlowAnalysis(c).output,
    future: cashFlowForecast(c).output,
    history: repaymentAnalysis(c).output,
    scope: 'cash-based management report; not statutory accounts',
  });

export const SKILL_REGISTRY = {
  'cash-flow-analysis': cashFlowAnalysis,
  'cash-flow-forecast': cashFlowForecast,
  'scenario-analysis': scenarioAnalysis,
  'receivables-analysis': receivablesAnalysis,
  'invoice-analysis': invoiceAnalysis,
  'supplier-analysis': supplierAnalysis,
  reconciliation: reconciliation,
  'working-capital': workingCapital,
  'treasury-monitor': treasuryMonitor,
  'obligation-analysis': obligationAnalysis,
  'repayment-analysis': repaymentAnalysis,
  'financial-report': financialReport,
} as const;

export function runSkill(name: string, c: SkillContext): SkillResult {
  ensure(Object.hasOwn(SKILL_REGISTRY, name), 'UNAUTHORIZED_AGENT_TOOL');
  return SKILL_REGISTRY[name as keyof typeof SKILL_REGISTRY](c);
}

export function analyze(graph: Graph, question: Question, now = Date.now()): Run {
  validateGraph(graph, now);
  ensure(
    typeof question.question === 'string' && question.question.length <= 500,
    'INVALID_QUESTION'
  );
  ensure(
    /inventory|restock|order|afford/i.test(question.question),
    'UNSUPPORTED_QUESTION'
  );
  ensure(
    question.purchaseId === 'restock-1' &&
      graph.records.some((r) => r.id === question.purchaseId && r.kind === 'inventory'),
    'UNSUPPORTED_PURCHASE'
  );

  const ctx: SkillContext = { graph, question, now };
  const skills = Object.keys(SKILL_REGISTRY).map((n) => runSkill(n, ctx));
  const cap = workingCapital(ctx).output;
  const scenarios = scenarioAnalysis(ctx).output;
  const purchase = graph.records.find((r) => r.id === question.purchaseId)!.amount;

  const partial: Omit<Run, 'runHash'> = {
    id: hash({ graph: hash(graph), question, policy: POLICY }),
    graphHash: hash(graph),
    graphVersion: graph.version,
    createdAt: now,
    question,
    skills,
    facilityNGN: cap.eligible ? cap.facility : 0,
    ownCashNGN: purchase - cap.facility,
    recommendation: {
      recommendation: cap.eligible
        ? 'Review a cash-plus-smaller-facility option if maintaining the full inventory order is necessary.'
        : 'Reduce or defer the purchase; do not issue financing.',
      reason:
        'Compare no-debt alternatives first. Financing is conditional on inventory necessity, conversion availability, lender approval, and stress-tested repayment capacity.',
      inputsUsed: question,
      evidenceRefs: graph.records.map((r) => r.id),
      assumptions: [
        ...cashFlowForecast(ctx).assumptions,
        ...scenarioAnalysis(ctx).assumptions,
        ...workingCapital(ctx).assumptions,
      ],
      calculations: workingCapital(ctx).calculations,
      scenarioResults: [...scenarios, cap.funded],
      riskFlags: [
        'FICTIONAL_BUSINESS',
        'SALES_ASSUMED',
        'CUSTOMER_PAYMENT_UNCERTAIN',
        'SUPPLIER_DELAY_UNAPPROVED',
        'FX_AND_OFFRAMP_NOT_EXECUTED',
        'LENDER_CAPITAL_NOT_COMMITTED',
        'NO_PREDICTION_ACCURACY_CLAIM',
      ],
      confidence: {
        level: 'conditional',
        basis: 'Reproducible arithmetic on demo inputs; not an empirical probability.',
      },
      policyVersion: POLICY,
      recommendedAction: cap.eligible ? 'REVIEW_FINANCING' : 'REDUCE_ORDER',
      requiresHumanApproval: true,
    },
  };

  return { ...partial, runHash: hash(partial) };
}

export function validateAgentIntent(v: unknown): Question {
  ensure(v && typeof v === 'object' && !Array.isArray(v), 'INVALID_AGENT_INTENT');
  const x = v as Record<string, unknown>;
  ensure(
    Object.keys(x).sort().join(',') === 'horizonDays,purchaseId,question',
    'HALLUCINATED_OR_UNAUTHORIZED_FIELDS'
  );
  ensure(
    x.purchaseId === 'restock-1' && x.horizonDays === 35 && typeof x.question === 'string',
    'INVALID_AGENT_INTENT'
  );
  return x as unknown as Question;
}
