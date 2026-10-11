import type { AgentToolDefinition, SkillContext, SkillResult, Run, Scenario } from './types.ts';
import {
  cashFlowAnalysis,
  scenarioAnalysis,
  receivablesAnalysis,
  invoiceAnalysis,
  workingCapital,
  obligationAnalysis,
  repaymentAnalysis,
  financialReport,
  forecast,
  analyze,
  BASE_SCENARIO,
} from './skills.ts';
import { ensure } from './crypto.ts';

export const KORA_AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'kora_analyze_cash_flow',
    description:
      'Evaluate SME opening balance, projected sales, receivables, and operating obligations deterministically.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kora_forecast_cash',
    description:
      'Compute daily netted cash-flow ladder for an SME given specific scenario parameters (sales bps, invoice delay, purchase delay).',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the scenario' },
        salesBps: { type: 'number', description: 'Sales percentage in basis points (10000 = 100%)' },
        invoiceDelayDays: { type: 'number', description: 'Days customer payments are delayed' },
        purchaseBps: { type: 'number', description: 'Purchase order size in bps (10000 = 100%)' },
        purchaseDelayDays: { type: 'number', description: 'Days inventory payment is delayed' },
        facility: { type: 'number', description: 'Inflow from external facility in kobo' },
        repay: { type: 'number', description: 'Outflow to repay facility in kobo' },
        repayDay: { type: 'number', description: 'Day number on which facility is repaid' },
      },
      required: ['name', 'salesBps', 'invoiceDelayDays'],
    },
  },
  {
    name: 'kora_stress_test',
    description:
      'Run standard 5-scenario adverse stress testing matrix (baseline, invoice delay +7d, sales -20%, combined adverse, supplier delay).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kora_evaluate_working_capital',
    description:
      'Calculate baseline liquidity deficit, adverse stress deficit, safety reserve, and maximum eligible facility.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kora_audit_invoices',
    description:
      'Verify cryptographic integrity of invoices and restock orders; detect duplicate external references.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'kora_full_underwriting_run',
    description:
      'Execute complete deterministic underwriting analysis across all 12 skills, producing a verifiable signed Run.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Natural language underwriting question' },
        purchaseId: { type: 'string', description: 'Target purchase ID (e.g. restock-1)' },
        horizonDays: { type: 'number', description: 'Forecasting horizon in days (30-35)' },
      },
      required: ['question', 'purchaseId', 'horizonDays'],
    },
  },
];

export function executeAgentTool(
  toolName: string,
  args: Record<string, unknown>,
  context: SkillContext
): SkillResult | Run {
  switch (toolName) {
    case 'kora_analyze_cash_flow':
      return cashFlowAnalysis(context);

    case 'kora_forecast_cash': {
      const scenario: Scenario = {
        name: typeof args.name === 'string' ? args.name : 'custom-scenario',
        salesBps: typeof args.salesBps === 'number' ? args.salesBps : BASE_SCENARIO.salesBps,
        invoiceDelayDays:
          typeof args.invoiceDelayDays === 'number'
            ? args.invoiceDelayDays
            : BASE_SCENARIO.invoiceDelayDays,
        purchaseBps:
          typeof args.purchaseBps === 'number' ? args.purchaseBps : BASE_SCENARIO.purchaseBps,
        purchaseDelayDays:
          typeof args.purchaseDelayDays === 'number'
            ? args.purchaseDelayDays
            : BASE_SCENARIO.purchaseDelayDays,
        facility: typeof args.facility === 'number' ? args.facility : BASE_SCENARIO.facility,
        repay: typeof args.repay === 'number' ? args.repay : BASE_SCENARIO.repay,
        repayDay: typeof args.repayDay === 'number' ? args.repayDay : BASE_SCENARIO.repayDay,
      };
      const f = forecast(context, scenario);
      return {
        skill: 'custom-forecast',
        version: '1.0.0',
        status: 'REAL — LOCAL',
        dataMode: context.graph.mode,
        evidenceRefs: context.graph.records.map((r) => r.id),
        assumptions: ['Custom agent-specified scenario run.'],
        calculations: ['Netted daily cash positions.'],
        output: f,
      };
    }

    case 'kora_stress_test':
      return scenarioAnalysis(context);

    case 'kora_evaluate_working_capital':
      return workingCapital(context);

    case 'kora_audit_invoices':
      return invoiceAnalysis(context);

    case 'kora_receivables_summary':
      return receivablesAnalysis(context);

    case 'kora_obligations_summary':
      return obligationAnalysis(context);

    case 'kora_repayment_history':
      return repaymentAnalysis(context);

    case 'kora_financial_report':
      return financialReport(context);

    case 'kora_full_underwriting_run': {
      const questionStr = typeof args.question === 'string' ? args.question : context.question.question;
      const purchaseId = typeof args.purchaseId === 'string' ? args.purchaseId : context.question.purchaseId;
      const horizonDays = typeof args.horizonDays === 'number' ? args.horizonDays : context.question.horizonDays;
      return analyze(context.graph, { question: questionStr, purchaseId, horizonDays }, context.now);
    }

    default:
      ensure(false, `UNKNOWN_AGENT_TOOL: ${toolName}`);
  }
}

export function formatOpenAITools() {
  return KORA_AGENT_TOOLS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export function formatAnthropicTools() {
  return KORA_AGENT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}
