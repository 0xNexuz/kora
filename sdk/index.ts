export * from './types.ts';
export * from './crypto.ts';
export * from './skills.ts';
export * from './policy.ts';
export * from './facility.ts';
export * from './agent.ts';
export * from './integrations.ts';

import type { Graph, Question, Run, SkillContext, Scenario, Forecast, Offer } from './types.ts';
import { analyze, forecast } from './skills.ts';
import { issueOffer, authorizeOffer, approvalMessage } from './policy.ts';
import { KoraFacilityClient } from './facility.ts';
import {
  KORA_AGENT_TOOLS,
  executeAgentTool,
  formatOpenAITools,
  formatAnthropicTools,
} from './agent.ts';

export class KoraSDK {
  public facility: KoraFacilityClient;

  constructor(opts?: {
    rpcUrl?: string;
    chainId?: number;
    facilityAddress?: string;
    usdcAddress?: string;
  }) {
    this.facility = new KoraFacilityClient(opts);
  }

  analyze(graph: Graph, question: Question, now = Date.now()): Run {
    return analyze(graph, question, now);
  }

  forecast(ctx: SkillContext, scenario: Scenario): Forecast {
    return forecast(ctx, scenario);
  }

  issueOffer(
    graph: Graph,
    run: Run,
    owner: string,
    salt: string,
    now = Date.now()
  ): Offer {
    return issueOffer(graph, run, owner, salt, now);
  }

  authorizeOffer(
    offer: Offer,
    graph: Graph,
    actor: string,
    now: number,
    chainId: number
  ): void {
    authorizeOffer(offer, graph, actor, now, chainId);
  }

  approvalMessage(offer: Offer, contractAddress?: string): string {
    return approvalMessage(offer, contractAddress ?? this.facility.defaultFacility);
  }

  executeTool(toolName: string, args: Record<string, unknown>, context: SkillContext) {
    return executeAgentTool(toolName, args, context);
  }

  getAgentTools(format: 'openai' | 'anthropic' | 'raw' = 'raw') {
    if (format === 'openai') return formatOpenAITools();
    if (format === 'anthropic') return formatAnthropicTools();
    return KORA_AGENT_TOOLS;
  }
}
