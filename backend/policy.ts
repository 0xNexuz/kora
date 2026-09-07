import {randomBytes} from 'node:crypto';
import {hash,ensure,CHAIN,USDC,POLICY,DAY} from './domain.ts';
import type {Graph,Run} from './domain.ts';
import {analyze} from './skills.ts';

export interface Offer {id:string;runId:string;runHash:string;graphHash:string;policyVersion:string;businessCommitment:string;obligationCommitment:string;evidenceCommitment:string;borrower:string;lender:string;chainId:number;token:string;principal:string;fee:string;dueAt:number;expiresAt:number;facilityNGN:number;fx:{nairaPerUSDC:number;mode:'DEMO';conversionExecuted:false};status:'PROPOSED'|'APPROVED'|'REGISTERED'|'DRAWN'|'REPAID';contract:string|null;repaid:string;}
export function issueOffer(g:Graph,r:Run,owner:string,salt:string,now:number):Offer{
 ensure(now-r.createdAt<=15*60000&&r.createdAt<=now,'STALE_RUN');ensure(hash(g)===r.graphHash,'EVIDENCE_MODIFIED');
 const recomputed=analyze(g,r.question,r.createdAt);ensure(recomputed.runHash===r.runHash,'RUN_MODIFIED');ensure(r.facilityNGN>0&&r.recommendation.recommendedAction==='REVIEW_FINANCING','POLICY_DENIED');
 const fx=1600;const numerator=BigInt(r.facilityNGN)*1000000n;const denominator=BigInt(fx*100);const principal=(numerator+denominator-1n)/denominator;const fee=(principal+99n)/100n;
 ensure(principal>0n&&principal<=1000000000n,'FACILITY_LIMIT');const nonce=randomBytes(32).toString('hex');
 return {id:hash({nonce,run:r.id}),runId:r.id,runHash:r.runHash,graphHash:r.graphHash,policyVersion:POLICY,businessCommitment:hash({salt,business:g.id}),obligationCommitment:hash({salt,business:g.id,purchase:r.question.purchaseId}),evidenceCommitment:hash({salt,run:r.runHash}),borrower:owner.toLowerCase(),lender:owner.toLowerCase(),chainId:CHAIN,token:USDC,principal:principal.toString(),fee:fee.toString(),dueAt:Math.floor(now/1000)+30*DAY/1000,expiresAt:Math.floor(now/1000)+900,facilityNGN:r.facilityNGN,fx:{nairaPerUSDC:fx,mode:'DEMO',conversionExecuted:false},status:'PROPOSED',contract:null,repaid:'0'};
}
export function authorizeOffer(o:Offer,g:Graph,actor:string,now:number,chainId:number){ensure(actor.toLowerCase()===o.borrower,'WRONG_WALLET');ensure(chainId===CHAIN&&o.chainId===CHAIN,'WRONG_CHAIN');ensure(o.policyVersion===POLICY,'POLICY_BYPASS');ensure(now/1000<o.expiresAt,'EXPIRED_OFFER');ensure(hash(g)===o.graphHash,'EVIDENCE_MODIFIED');ensure(now-g.asOf<=DAY,'STALE_EVIDENCE');}
export function approvalMessage(o:Offer,contract:string){return ['Kora Base Sepolia human approval','No mainnet funds. Fictional Ada’s Pharmacy. Self-funded demonstration.',`Chain: ${CHAIN}`,`Contract: ${contract.toLowerCase()}`,`Offer: ${o.id}`,`Run: ${o.runHash}`,`Principal USDC atomic units: ${o.principal}`,`Fee USDC atomic units: ${o.fee}`,`Due Unix seconds: ${o.dueAt}`,`Expires Unix seconds: ${o.expiresAt}`,`Policy: ${o.policyVersion}`,`Evidence: ${o.evidenceCommitment}`,'Approve only these exact terms. The wallet must still authorize each transaction.'].join('\n');}
