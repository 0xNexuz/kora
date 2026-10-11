#!/usr/bin/env node
/**
 * Kora CLI - Command Line Testing & Inspection Tool
 * 
 * Subcommands:
 *   kora test-drive                     Run the end-to-end interactive underwriting walkthrough
 *   kora analyze [question]             Run deterministic underwriting on custom questions
 *   kora forecast [options]             Simulate cash flow with custom sales drop and invoice delay
 *   kora inspect-wallet <address>       Inspect ETH gas and USDC balance on Base Sepolia
 *   kora serve [--port 4001]            Start backend server and MetaMask testnet console
 */

import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import {
  KoraSDK,
  createDemoFixture,
} from '../sdk/index.ts';

const args = process.argv.slice(2);
const command = args[0] || 'test-drive';

function printHelp() {
  console.log(`
Kora Command Line Interface (CLI)

Usage:
  node bin/kora.mjs <command> [options]

Commands:
  test-drive                 Run the complete interactive 6-step underwriting walkthrough
  analyze [question]         Run 12 deterministic financial skills on an underwriting question
  forecast [options]         Simulate cash flow under custom economic parameters
  inspect-wallet <address>   Query Base Sepolia RPC for ETH gas and USDC balance
  serve [--port 4001]        Start backend server with the browser approval console

Options for forecast:
  --sales-drop <pct>         Percentage drop in sales (e.g. 20 for 20% drop)
  --delay <days>             Days customer invoice payments are delayed (e.g. 7)
  --purchase-delay <days>    Days inventory payment is delayed (e.g. 14)

Examples:
  node bin/kora.mjs test-drive
  node bin/kora.mjs analyze "Can I restock medicine safely?"
  node bin/kora.mjs forecast --sales-drop 25 --delay 10
  node bin/kora.mjs inspect-wallet 0xF6D3809d67238EC39a6350b2D7445B53Ab896BBb
  node bin/kora.mjs serve
`);
}

async function main() {
  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return;
  }

  const sdk = new KoraSDK();

  if (command === 'test-drive' || command === 'demo') {
    const cp = spawn('node', ['--use-system-ca', 'scripts/test-drive.mjs'], {
      stdio: 'inherit',
    });
    cp.on('exit', (code) => process.exit(code || 0));
    return;
  }

  if (command === 'analyze') {
    const qText = args[1] || 'Can Ada afford the inventory restock for day 12?';
    console.log(`\n🔍 Analyzing question: "${qText}"`);
    const graph = createDemoFixture();
    const run = sdk.analyze(graph, {
      question: qText,
      purchaseId: 'restock-1',
      horizonDays: 35,
    });

    console.log(`\nUnderwriting Decision:`);
    console.log(`  Recommendation:      ${run.recommendation.recommendedAction}`);
    console.log(`  Reason:              ${run.recommendation.reason}`);
    console.log(`  Eligible Facility:   ₦${(run.facilityNGN / 100).toLocaleString('en-NG')}`);
    console.log(`  Borrower Own Equity: ₦${(run.ownCashNGN / 100).toLocaleString('en-NG')}`);
    console.log(`  Run Hash:            ${run.runHash}`);
    console.log(`  Skills Evaluated:    ${run.skills.length} / 12`);
    return;
  }

  if (command === 'forecast') {
    const { values } = parseArgs({
      args: args.slice(1),
      options: {
        'sales-drop': { type: 'string', default: '0' },
        delay: { type: 'string', default: '0' },
        'purchase-delay': { type: 'string', default: '0' },
      },
    });

    const salesDrop = Math.max(0, Math.min(100, Number(values['sales-drop'] || 0)));
    const delay = Math.max(0, Math.min(35, Number(values.delay || 0)));
    const pDelay = Math.max(0, Math.min(35, Number(values['purchase-delay'] || 0)));
    const salesBps = Math.round((100 - salesDrop) * 100);

    console.log(`\n📈 Simulating Cash-Flow Ladder:`);
    console.log(`  Sales Drop:          ${salesDrop}% (${salesBps} bps)`);
    console.log(`  Invoice Delay:       ${delay} days`);
    console.log(`  Purchase Delay:      ${pDelay} days`);

    const graph = createDemoFixture();
    const scenario = {
      name: `custom-${salesDrop}pct-drop-${delay}d-delay`,
      salesBps,
      invoiceDelayDays: delay,
      purchaseBps: 10000,
      purchaseDelayDays: pDelay,
      facility: 0,
      repay: 0,
      repayDay: 30,
    };

    const ctx = {
      graph,
      question: { question: 'Custom scenario', purchaseId: 'restock-1', horizonDays: 35 },
      now: graph.asOf,
    };
    const f = sdk.forecast(ctx, scenario);

    console.log(`\nSimulation Results:`);
    console.log(`  Minimum Cash Point:  ₦${(f.minimum / 100).toLocaleString('en-NG')}`);
    console.log(`  Liquidity Deficit:   ₦${(f.deficit / 100).toLocaleString('en-NG')}`);
    console.log(`  First Deficit Day:   ${f.firstDeficitDay ? `Day ${f.firstDeficitDay}` : 'None'}`);
    console.log(`  Ending Cash Day 35:  ₦${(f.ending / 100).toLocaleString('en-NG')}`);
    return;
  }

  if (command === 'inspect-wallet') {
    const targetAddress = args[1];
    if (!targetAddress) {
      console.error('Error: Please provide a wallet address to inspect.');
      console.error('Example: node bin/kora.mjs inspect-wallet 0xF6D3809d67238EC39a6350b2D7445B53Ab896BBb');
      process.exit(1);
    }

    console.log(`\n📡 Inspecting wallet on Base Sepolia (84532): ${targetAddress}`);
    try {
      const info = await sdk.facility.inspectWallet(targetAddress);
      console.log(`  Gas Balance:  ${Number(info.gasWei) / 1e18} ETH`);
      console.log(`  USDC Balance: $${(Number(info.usdcAtomic) / 1e6).toFixed(2)} USDC (${info.usdcAtomic} units)`);
      console.log(`  Target Token: ${info.token}`);
      console.log(`  Explorer:     https://sepolia.basescan.org/address/${targetAddress}`);
    } catch (err) {
      console.error(`Error querying wallet:`, err.message);
    }
    return;
  }

  if (command === 'serve') {
    console.log('\n🚀 Starting Kora Backend API & Testnet Approval Console...');
    console.log('   Console URL: http://localhost:4001/approval');
    console.log('   API Root:    http://localhost:4001/v1');
    console.log('   (Press Ctrl+C to stop)\n');

    const serverProc = spawn(
      'node',
      ['--experimental-transform-types', 'backend/server.ts'],
      { stdio: 'inherit' }
    );
    serverProc.on('exit', (code) => process.exit(code || 0));
    return;
  }

  console.error(`Unknown command: "${command}"`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error('CLI error:', err);
  process.exit(1);
});
