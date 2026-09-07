import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {ensure,hash} from './domain.ts';

// Local backend storage. Sensitive payloads encrypted; SQLite uniqueness/CAS are the concurrency boundary.
export class Store {
 db:DatabaseSync; key:Buffer;
 constructor(directory:string){mkdirSync(directory,{recursive:true});const keyFile=join(directory,'data.key');if(!existsSync(keyFile))writeFileSync(keyFile,randomBytes(32),{mode:0o600,flag:'wx'});this.key=readFileSync(keyFile);ensure(this.key.length===32,'INVALID_STORAGE_KEY');this.db=new DatabaseSync(join(directory,'kora.sqlite'));this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL,id TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY,previous TEXT NOT NULL,digest TEXT NOT NULL,payload TEXT NOT NULL);');}
 seal(v:unknown){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',this.key,iv);const b=Buffer.concat([c.update(JSON.stringify(v),'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),b]).toString('base64');}
 open<T>(s:string):T{const b=Buffer.from(s,'base64'),c=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([c.update(b.subarray(28)),c.final()]).toString());}
 get<T>(kind:string,id:string):T|null{const r=this.db.prepare('SELECT payload FROM records WHERE kind=? AND id=?').get(kind,id) as {payload:string}|undefined;return r?this.open<T>(r.payload):null;}
 list<T>(kind:string):T[]{return (this.db.prepare('SELECT payload FROM records WHERE kind=? ORDER BY id').all(kind) as {payload:string}[]).map(r=>this.open<T>(r.payload));}
 insert(kind:string,id:string,v:unknown){ensure(!this.get(kind,id),'DUPLICATE_'+kind.toUpperCase());this.db.prepare('INSERT INTO records(kind,id,revision,payload) VALUES(?,?,1,?)').run(kind,id,this.seal(v));}
 replace(kind:string,id:string,v:unknown){const r=this.db.prepare('UPDATE records SET revision=revision+1,payload=? WHERE kind=? AND id=?').run(this.seal(v),kind,id);ensure(r.changes===1,'NOT_FOUND');}
 atomic<T>(fn:()=>T):T{this.db.exec('BEGIN IMMEDIATE');try{const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 audit(event:unknown){const last=this.db.prepare('SELECT digest FROM audit ORDER BY seq DESC LIMIT 1').get() as {digest:string}|undefined;const previous=last?.digest??'GENESIS',digest=hash({previous,event});this.db.prepare('INSERT INTO audit(previous,digest,payload) VALUES(?,?,?)').run(previous,digest,this.seal(event));return digest;}
 verifyAudit(){let previous='GENESIS';for(const r of this.db.prepare('SELECT previous,digest,payload FROM audit ORDER BY seq').all() as {previous:string;digest:string;payload:string}[]){ensure(r.previous===previous&&hash({previous,event:this.open(r.payload)})===r.digest,'AUDIT_TAMPERED');previous=r.digest;}return previous;}
 close(){this.db.close();}
}
