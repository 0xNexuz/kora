import { createHash } from 'node:crypto';

export class KoraError extends Error { code:string; constructor(code:string){super(code);this.code=code;} }
export function ensure(value:unknown,code:string):asserts value { if(!value)throw new KoraError(code); }
export const POLICY='kora-demo-policy/1';
export const OWNER='0x7034af41397893321c4458abb3b98f6c67065fab';
export const CHAIN=84532;
export const USDC='0x036cbd53842c5426634e7929541ec2318f3dcf7e';
export const DAY=86400000;
export type Mode='DEMO'|'REAL';
export type Kind='opening-cash'|'sale'|'receivable'|'payroll'|'expense'|'debt'|'inventory'|'repayment';
export interface RecordRow { id:string; businessId:string; sourceId:string; externalId:string; kind:Kind; amount:number; day:number; counterparty:string; mode:Mode; recordedAt:number; evidenceHash:string; status:'expected'|'observed'; }
export interface Graph { id:string; name:string; mode:Mode; asOf:number; version:number; records:RecordRow[]; history:Performance[]; }
export interface Performance { agreementId:string; receiptId:string; principalUSDC:string; repaidUSDC:string; amountNGN:number; onTime:boolean; blockNumber:string; transactionHash:string; chainId:number; mode:'REAL — TESTNET'; }
export interface Question { question:string; purchaseId:string; horizonDays:number; }
export interface Scenario { name:string; salesBps:number; invoiceDelayDays:number; purchaseBps:number; purchaseDelayDays:number; facility:number; repay:number; repayDay:number; }
export interface Forecast { name:string; daily:{day:number;opening:number;inflow:number;outflow:number;closing:number;evidenceRefs:string[]}[]; minimum:number; deficit:number; firstDeficitDay:number|null; ending:number; }
export interface SkillContext { graph:Graph; question:Question; now:number; }
export interface SkillResult<T=unknown> { skill:string; version:string; status:'REAL — LOCAL'; dataMode:Mode; evidenceRefs:string[]; assumptions:string[]; calculations:string[]; output:T; }
export interface Recommendation { recommendation:string; reason:string; inputsUsed:Question; evidenceRefs:string[]; assumptions:string[]; calculations:string[]; scenarioResults:Forecast[]; riskFlags:string[]; confidence:{level:'conditional';basis:string}; policyVersion:string; recommendedAction:'REVIEW_FINANCING'|'REDUCE_ORDER'|'NO_FINANCING'; requiresHumanApproval:true; }
export interface Run { id:string; graphHash:string; graphVersion:number; createdAt:number; question:Question; skills:SkillResult[]; recommendation:Recommendation; facilityNGN:number; ownCashNGN:number; runHash:string; }
export function canonical(v:unknown):string {if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';}
export function hash(v:unknown){return '0x'+createHash('sha256').update(canonical(v)).digest('hex');}
export function money(v:unknown){ensure(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=1e12,'INVALID_MONEY');return v;}
export function rowHash(r:Omit<RecordRow,'evidenceHash'>|RecordRow){const {evidenceHash:_,...rest}=r as RecordRow;return hash(rest);}
export function validateGraph(g:Graph,now:number){
 ensure(g.id==='adas-pharmacy'&&g.mode==='DEMO','UNSUPPORTED_BUSINESS');
 ensure(Number.isSafeInteger(g.asOf)&&g.asOf<=now&&now-g.asOf<=DAY,'STALE_EVIDENCE');
 ensure(g.records.length>0&&g.records.length<=1000,'MISSING_EVIDENCE');
 const ids=new Set<string>(),external=new Set<string>();
 for(const r of g.records){ensure(r.businessId===g.id&&r.mode===g.mode,'CROSS_BUSINESS_EVIDENCE');ensure(r.sourceId==='fictional-fixture/v1','UNSUPPORTED_EVIDENCE');ensure(!ids.has(r.id)&&!external.has(r.sourceId+':'+r.externalId),'DUPLICATE_INVOICE');ids.add(r.id);external.add(r.sourceId+':'+r.externalId);money(r.amount);ensure(Number.isInteger(r.day)&&r.day>=0&&r.day<=365,'INVALID_DATE');ensure(r.recordedAt<=now&&now-r.recordedAt<=DAY,'STALE_EVIDENCE');ensure(rowHash(r)===r.evidenceHash,'EVIDENCE_MODIFIED');ensure(['opening-cash','sale','receivable','payroll','expense','debt','inventory','repayment'].includes(r.kind),'UNSUPPORTED_EVIDENCE');}
 for(const kind of ['opening-cash','sale','receivable','payroll','expense','debt','inventory'])ensure(g.records.some(r=>r.kind===kind),'MISSING_EVIDENCE');
 ensure(g.records.filter(r=>r.kind==='opening-cash').length===1,'AMBIGUOUS_OPENING_BALANCE');
}
export function fixture(asOf=Date.now()):Graph{
 const g:Graph={id:'adas-pharmacy',name:"Ada's Pharmacy (fictional)",mode:'DEMO',asOf,version:1,records:[],history:[]};
 const add=(id:string,kind:Kind,naira:number,day:number,counterparty:string)=>{const r:RecordRow={id,businessId:g.id,sourceId:'fictional-fixture/v1',externalId:id,kind,amount:naira*100,day,counterparty,mode:'DEMO',recordedAt:asOf,evidenceHash:'',status:kind==='opening-cash'?'observed':'expected'};r.evidenceHash=rowHash(r);g.records.push(r);};
 add('bank-opening','opening-cash',1200000,0,'Fictional bank statement');
 for(let d=1;d<=35;d++)add('sales-'+d,'sale',20000,d,'Expected pharmacy sales');
 add('payroll-1','payroll',300000,5,'Staff');add('rent-1','expense',180000,8,'Premises');add('debt-1','debt',200000,10,'Existing debt');add('restock-1','inventory',1400000,12,'Fictional medicine supplier');add('customer-1','receivable',1600000,20,'Fictional wholesale customer');return g;
}
