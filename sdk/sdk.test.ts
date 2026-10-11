import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KoraSDK,
  createDemoFixture,
  createSalt,
  terms,
  encodeTransaction,
  DEFAULT_CHAIN,
  DEFAULT_FACILITY,
  KORA_AGENT_TOOLS,
  type Question,
  type SkillContext,
} from './index.ts';

test('SDK: initializes with default Base Sepolia configuration', () => {
  const sdk = new KoraSDK();
  assert.equal(sdk.facility.chainId, DEFAULT_CHAIN);
  assert.equal(sdk.facility.defaultFacility.toLowerCase(), DEFAULT_FACILITY.toLowerCase());
});

test('SDK: runs deterministic financial skills and validates graph fixture', () => {
  const sdk = new KoraSDK();
  const fixture = createDemoFixture();
  const question: Question = {
    question: 'Can Ada restock medicine safely?',
    purchaseId: 'restock-1',
    horizonDays: 35,
  };
  const ctx: SkillContext = { graph: fixture, question, now: fixture.asOf };

  const cashFlow = sdk.executeTool('kora_analyze_cash_flow', {}, ctx);
  assert.ok('output' in cashFlow);
  const out = cashFlow.output as { available: number; expectedSales: number };
  assert.equal(out.available, 120000000); // 1.2M NGN in kobo
  assert.equal(out.expectedSales, 70000000); // 35 * 20k NGN in kobo
});

test('SDK: analyzes business and produces deterministic recommendation', () => {
  const sdk = new KoraSDK();
  const fixture = createDemoFixture();
  const question: Question = {
    question: 'Can Ada afford the inventory restock?',
    purchaseId: 'restock-1',
    horizonDays: 35,
  };

  const run1 = sdk.analyze(fixture, question, fixture.asOf);
  const run2 = sdk.analyze(fixture, question, fixture.asOf);

  assert.equal(run1.runHash, run2.runHash);
  assert.equal(run1.recommendation.recommendedAction, 'REVIEW_FINANCING');
  assert.equal(run1.facilityNGN, 78800000); // 788,000 NGN
  assert.equal(run1.skills.length, 12);
});

test('SDK: issues policy offer with blinded commitments and exact USDC math', () => {
  const sdk = new KoraSDK();
  const fixture = createDemoFixture();
  const owner = '0x7034af41397893321c4458abb3b98f6c67065fab';
  const question: Question = {
    question: 'Can Ada afford the inventory restock?',
    purchaseId: 'restock-1',
    horizonDays: 35,
  };

  const run = sdk.analyze(fixture, question, fixture.asOf);
  const salt = createSalt();
  const offer = sdk.issueOffer(fixture, run, owner, salt, fixture.asOf);

  assert.equal(offer.status, 'PROPOSED');
  assert.equal(offer.principal, '492500000'); // 492.5 USDC atomic units
  assert.equal(offer.fee, '4925000'); // 1% fee = 4.925 USDC
  assert.ok(offer.businessCommitment.startsWith('0x'));
  assert.ok(offer.obligationCommitment.startsWith('0x'));
  assert.ok(offer.evidenceCommitment.startsWith('0x'));

  // Authorization check
  assert.doesNotThrow(() => {
    sdk.authorizeOffer(offer, fixture, owner, fixture.asOf, DEFAULT_CHAIN);
  });

  // Approval message includes commitments
  const msg = sdk.approvalMessage(offer, DEFAULT_FACILITY);
  assert.ok(msg.includes(`Principal USDC atomic units: ${offer.principal}`));
  assert.ok(msg.includes(`Fee USDC atomic units: ${offer.fee}`));
  assert.ok(msg.includes(`Evidence: ${offer.evidenceCommitment}`));
});

test('SDK: encodes onchain facility transactions for Base Sepolia', () => {
  const sdk = new KoraSDK();
  const fixture = createDemoFixture();
  const owner = '0x7034af41397893321c4458abb3b98f6c67065fab';
  const question: Question = {
    question: 'Can Ada afford the inventory restock?',
    purchaseId: 'restock-1',
    horizonDays: 35,
  };
  const run = sdk.analyze(fixture, question, fixture.asOf);
  const offer = sdk.issueOffer(fixture, run, owner, createSalt(), fixture.asOf);
  offer.contract = DEFAULT_FACILITY;
  offer.status = 'APPROVED';

  // Terms encoding
  const onchainTerms = terms(offer);
  assert.equal(onchainTerms.borrower.toLowerCase(), owner.toLowerCase());
  assert.equal(onchainTerms.principal, 492500000n);

  // Register transaction encoding
  const regTx = encodeTransaction(offer, 'register');
  assert.equal(regTx.to.toLowerCase(), DEFAULT_FACILITY.toLowerCase());
  assert.ok(regTx.data.startsWith('0x'));

  // Draw transaction encoding
  offer.status = 'REGISTERED';
  const drawTx = encodeTransaction(offer, 'draw');
  assert.equal(drawTx.action, 'draw');

  // Repay transaction encoding
  offer.status = 'DRAWN';
  const repayTx = encodeTransaction(offer, 'repay', '1000000');
  assert.equal(repayTx.action, 'repay');
});

test('SDK: formats AI Agent tool schemas and executes agent tools', () => {
  const sdk = new KoraSDK();
  const fixture = createDemoFixture();
  const question: Question = {
    question: 'Can Ada afford the inventory restock?',
    purchaseId: 'restock-1',
    horizonDays: 35,
  };
  const ctx: SkillContext = { graph: fixture, question, now: fixture.asOf };

  // Schemas
  const rawTools = sdk.getAgentTools('raw');
  assert.equal(rawTools.length, KORA_AGENT_TOOLS.length);

  const openaiTools = sdk.getAgentTools('openai') as { type: string; function: { name: string } }[];
  assert.equal(openaiTools[0].type, 'function');
  assert.ok(openaiTools[0].function.name.startsWith('kora_'));

  const anthropicTools = sdk.getAgentTools('anthropic') as { name: string; input_schema: object }[];
  assert.ok(anthropicTools[0].name.startsWith('kora_'));
  assert.ok(anthropicTools[0].input_schema);

  // Execution: Stress test tool
  const stressResult = sdk.executeTool('kora_stress_test', {}, ctx);
  assert.ok('output' in stressResult);
  assert.equal((stressResult.output as unknown[]).length, 6);

  // Execution: Working capital tool
  const wcResult = sdk.executeTool('kora_evaluate_working_capital', {}, ctx);
  assert.ok('output' in wcResult);
  const wcOut = wcResult.output as { eligible: boolean; facility: number };
  assert.equal(wcOut.eligible, true);
  assert.equal(wcOut.facility, 78800000);

  // Execution: Full underwriting run tool
  const fullRun = sdk.executeTool(
    'kora_full_underwriting_run',
    {
      question: 'Can Ada restock medicine?',
      purchaseId: 'restock-1',
      horizonDays: 35,
    },
    ctx
  );
  assert.ok('runHash' in fullRun);
});
