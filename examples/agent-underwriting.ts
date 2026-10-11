/**
 * Kora Developer Kit (SDK) Example: Autonomous SME Underwriting Agent
 * 
 * Demonstrates:
 * 1. Initializing KoraSDK
 * 2. Ingesting and validating an SME financial graph
 * 3. Running deterministic cash-flow and stress-test scenarios
 * 4. Deriving verifiable underwriting recommendations
 * 5. Generating blinded onchain commitments and Base Sepolia transaction data
 */

import {
  KoraSDK,
  createDemoFixture,
  createSalt,
  encodeTransaction,
  DEFAULT_FACILITY,
  type Question,
  type SkillContext,
} from '../sdk/index.ts';

async function main() {
  console.log('🤖 Initializing Kora Underwriting Agent...');
  const sdk = new KoraSDK();

  // 1. Ingest SME financial ledger records
  const graph = createDemoFixture();
  console.log(`📊 Ingested SME Graph: ${graph.name} (${graph.records.length} records)`);

  const question: Question = {
    question: 'Can Ada restock antibiotics inventory for day 12?',
    purchaseId: 'restock-1',
    horizonDays: 35,
  };
  const ctx: SkillContext = { graph, question, now: graph.asOf };

  // 2. Autonomous Agent Tool Calling: Analyze Cash Flow
  console.log('\n--- Step 1: Cash Flow Analysis ---');
  const cashFlow = sdk.executeTool('kora_analyze_cash_flow', {}, ctx);
  console.log('Cash flow summary:', JSON.stringify(cashFlow, null, 2));

  // 3. Autonomous Agent Tool Calling: Adverse Stress Testing
  console.log('\n--- Step 2: Adverse Stress Testing ---');
  const stress = sdk.executeTool('kora_stress_test', {}, ctx);
  if ('output' in stress && Array.isArray(stress.output)) {
    console.log(`Ran ${stress.output.length} stress scenarios.`);
    for (const s of stress.output) {
      console.log(`  - Scenario "${s.name}": minimum balance = ${s.minimum / 100} NGN, deficit = ${s.deficit / 100} NGN`);
    }
  }

  // 4. Autonomous Agent Tool Calling: Full Deterministic Underwriting Run
  console.log('\n--- Step 3: Complete Deterministic Underwriting Run ---');
  const run = sdk.analyze(graph, question, graph.asOf);
  console.log(`✅ Run ID: ${run.id}`);
  console.log(`✅ Run Hash: ${run.runHash}`);
  console.log(`✅ Recommendation: ${run.recommendation.recommendedAction}`);
  console.log(`   Reason: ${run.recommendation.reason}`);
  console.log(`   Calculated Facility: ${run.facilityNGN / 100} NGN`);
  console.log(`   Required Equity/Cash: ${run.ownCashNGN / 100} NGN`);

  // 5. Policy Offer Issuance with Blinded Cryptographic Commitments
  console.log('\n--- Step 4: Policy Offer Issuance ---');
  const owner = '0x7034af41397893321c4458abb3b98f6c67065fab';
  const privacySalt = createSalt();
  const offer = sdk.issueOffer(graph, run, owner, privacySalt, graph.asOf);
  offer.contract = DEFAULT_FACILITY;
  offer.status = 'APPROVED'; // Simulating human approval

  console.log(`Offer ID: ${offer.id}`);
  console.log(`Principal (USDC atomic): ${offer.principal} ($${Number(offer.principal) / 1e6})`);
  console.log(`Fee (USDC atomic): ${offer.fee} ($${Number(offer.fee) / 1e6})`);
  console.log(`Business Commitment: ${offer.businessCommitment}`);
  console.log(`Obligation Commitment: ${offer.obligationCommitment}`);
  console.log(`Evidence Commitment: ${offer.evidenceCommitment}`);

  // 6. Base Sepolia Transaction Encoding
  console.log('\n--- Step 5: Encoding Onchain Base Sepolia Calldata ---');
  const registerTx = encodeTransaction(offer, 'register');
  console.log(`Target Contract: ${registerTx.to}`);
  console.log(`Calldata (${registerTx.action}): ${registerTx.data.slice(0, 66)}...`);

  console.log('\n🎉 E2E Agent Underwriting Workflow Completed Successfully!');
}

main().catch((err) => {
  console.error('Error executing agent underwriting:', err);
  process.exit(1);
});
