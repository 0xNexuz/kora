import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  SKILLS,
  forecast,
  BASE,
  cashFlowAnalysis,
  cashFlowForecast,
  scenarioAnalysis,
  workingCapital,
  runSkill,
  analyze,
  validateAgentIntent,
} from './skills.ts';
import { fixture, hash, POLICY, KoraError } from './domain.ts';
import { QUESTION, richGraph } from './test-helpers.ts';
import type { SkillContext } from './domain.ts';

const now = Date.now();
const graph = fixture(now);
function ctx(overrides?: Partial<SkillContext>): SkillContext {
  return { graph, question: QUESTION, now, ...overrides };
}

test('twelve skills registered', () => {
  assert.equal(Object.keys(SKILLS).length, 12);
  assert.equal(runSkill('cash-flow-analysis', ctx()).skill, 'cash-flow-analysis');
});

test('runSkill rejects unknown tools', () => {
  assert.throws(
    () => runSkill('not-a-skill', ctx()),
    (e: unknown) => (e as KoraError).code === 'UNAUTHORIZED_AGENT_TOOL',
  );
});

test('baseline forecast arithmetic', () => {
  const f = forecast(ctx(), BASE);
  assert.equal(f.minimum, -64_000_000);
  assert.equal(f.deficit, 64_000_000);
  assert.equal(f.firstDeficitDay, 12);
  assert.equal(f.ending, 142_000_000);
  assert.equal(f.daily.length, 35);
  assert.equal(f.daily[0].closing, 122_000_000);
  assert.equal(f.daily[11].closing, -64_000_000);
});

test('forecast validates horizon and scenario', () => {
  assert.throws(
    () => forecast(ctx({ question: { ...QUESTION, horizonDays: 29 } }), BASE),
    (e: unknown) => (e as KoraError).code === 'INVALID_HORIZON',
  );
  assert.throws(
    () => forecast(ctx(), { ...BASE, salesBps: 10001 }),
    (e: unknown) => (e as KoraError).code === 'INVALID_SCENARIO',
  );
});

test('cash flow analysis sums', () => {
  const o = cashFlowAnalysis(ctx()).output as { available: number; expectedSales: number; receivables: number; obligations: number };
  assert.equal(o.available, 120_000_000);
  assert.equal(o.expectedSales, 70_000_000);
  assert.equal(o.receivables, 160_000_000);
  assert.equal(o.obligations, 208_000_000);
});

test('scenario analysis covers adverse cases', () => {
  const o = scenarioAnalysis(ctx()).output as { name: string }[];
  assert.deepEqual(o.map((s) => s.name), [
    'baseline',
    'invoice-delayed',
    'sales-down-20-percent',
    'combined-adverse',
    'delay-inventory',
    'smaller-order',
  ]);
});

test('working capital reaches a conditional facility', () => {
  const o = workingCapital(ctx()).output as {
    baseDeficit: number; stressDeficit: number; reserve: number; facility: number; fee: number; eligible: boolean; funded: { minimum: number };
  };
  assert.equal(o.baseDeficit, 64_000_000);
  assert.equal(o.stressDeficit, 68_800_000);
  assert.equal(o.reserve, 10_000_000);
  assert.equal(o.facility, 78_800_000);
  assert.equal(o.fee, 788_000);
  assert.equal(o.funded.minimum, 10_000_000);
  assert.equal(o.eligible, true);
});

test('analyze is deterministic and produces a financing recommendation', () => {
  const a1 = analyze(graph, QUESTION, now);
  const a2 = analyze(graph, QUESTION, now);
  assert.equal(a1.id, a2.id);
  assert.equal(a1.runHash, a2.runHash);
  assert.equal(a1.skills.length, 12);
  assert.equal(a1.facilityNGN, 78_800_000);
  assert.equal(a1.ownCashNGN, 61_200_000);
  assert.equal(a1.recommendation.recommendedAction, 'REVIEW_FINANCING');
  assert.equal(a1.recommendation.requiresHumanApproval, true);
  assert.equal(a1.recommendation.policyVersion, POLICY);
  const { runHash, ...partial } = a1;
  assert.equal(runHash, hash(partial));
});

test('analyze declines financing for a rich business', () => {
  const g = richGraph(now);
  const a = analyze(g, QUESTION, now);
  assert.equal(a.facilityNGN, 0);
  assert.equal(a.recommendation.recommendedAction, 'REDUCE_ORDER');
});

test('validateAgentIntent accepts only exact fields', () => {
  assert.deepEqual(validateAgentIntent({ ...QUESTION }), QUESTION);
  assert.throws(
    () => validateAgentIntent({ ...QUESTION, extra: 1 }),
    (e: unknown) => (e as KoraError).code === 'HALLUCINATED_OR_UNAUTHORIZED_FIELDS',
  );
  assert.throws(
    () => validateAgentIntent({ ...QUESTION, purchaseId: 'other' }),
    (e: unknown) => (e as KoraError).code === 'INVALID_AGENT_INTENT',
  );
  assert.throws(
    () => validateAgentIntent(null),
    (e: unknown) => (e as KoraError).code === 'INVALID_AGENT_INTENT',
  );
});

test('skill results carry evidence refs and assumptions', () => {
  const r = cashFlowForecast(ctx());
  assert.equal(r.status, 'REAL — LOCAL');
  assert.equal(r.dataMode, 'DEMO');
  assert.ok(r.evidenceRefs.length > 0);
  assert.ok(r.assumptions.length >= 2);
});