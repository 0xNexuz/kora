import type {Graph,Question,Run} from './domain.ts';
import type {Offer} from './policy.ts';
/** Frontend boundary: caller owns wallet/session UX; no arithmetic belongs in components. */
export class KoraClient{
 baseURL:string;token:string;
 constructor(baseURL:string,token:string){this.baseURL=baseURL;this.token=token;}
 async request<T>(path:string,body?:unknown):Promise<T>{const r=await fetch(this.baseURL+'/v1/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;}
 graph(){return this.request<Graph>('graph');}
 analyze(question:Question){return this.request<Run>('runs',question);}
 offers(){return this.request<Offer[]>('offers');}
 propose(runId:string){return this.request<Offer>('offers',{runId});}
}
