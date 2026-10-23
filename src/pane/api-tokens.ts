import { operatorAuth, type Bindings } from '../auth.server'
export const tokenScopes=['status:read','pages:read','collections:read','draft:write','imports:write'] as const
export type ApiIdentity={operator:{id:string;displayName:string;role:string;version:number};scopes?:string[];tokenId?:string}
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')
export async function apiIdentity(request:Request,env:Bindings):Promise<ApiIdentity|null>{
 const header=request.headers.get('authorization')
 if(header===null)return operatorAuth(env).getSession(request)
 if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(header))return null
 const row=await env.DB.prepare(`SELECT t.id,t.scopes,o.id AS operatorId,o.display_name,o.role,o.version
  FROM pane_api_tokens t JOIN oa_operators o ON o.id=t.operator_id
  WHERE t.token_hash=? AND t.revoked_at IS NULL AND t.expires_at>? AND o.status='active' AND o.version=t.operator_version
  AND NOT EXISTS(SELECT 1 FROM pane_anonymized_people p WHERE p.id=o.id)`)
  .bind(await digest(header.slice(7)),Date.now()).first<{id:string;scopes:string;operatorId:string;display_name:string;role:string;version:number}>()
 return row?{operator:{id:row.operatorId,displayName:row.display_name,role:row.role,version:row.version},scopes:JSON.parse(row.scopes),tokenId:row.id}:null
}
export async function createToken(db:D1Database,actorId:string,input:Record<string,unknown>){
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>80)throw Error('Name this agent or integration (up to 80 characters).')
 if(!Array.isArray(input.scopes)||!input.scopes.length||input.scopes.some(s=>!tokenScopes.includes(s)))throw Error('Choose explicit supported scopes.')
 const operatorId=typeof input.operatorId==='string'?input.operatorId:actorId
 const operator=await db.prepare("SELECT id,version FROM oa_operators WHERE id=? AND status='active'").bind(operatorId).first<{id:string;version:number}>()
 if(!operator)throw Error('Choose an active person.')
 const days=input.days??7
 if(typeof days!=='number'||!Number.isInteger(days)||days<1||days>30)throw Error('Token lifetime must be 1 to 30 days.')
 const token=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')
 const id=crypto.randomUUID(),now=Date.now(),expiresAt=now+days*86400000
 await db.prepare('INSERT INTO pane_api_tokens(id,name,operator_id,operator_version,token_hash,scopes,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)')
  .bind(id,input.name.trim(),operatorId,operator.version,await digest(token),JSON.stringify([...new Set(input.scopes)]),now,expiresAt).run()
 return {id,token,expiresAt,scopes:input.scopes}
}
/** The stored token a refused call presents (expired, revoked or its person deactivated).
 * An erased person's tokens stay anonymous. */
async function presentedTokenId(db:D1Database,request:Request){
 const header=request.headers.get('authorization')
 if(header===null||!/^Bearer [A-Za-z0-9_-]{43}$/.test(header))return null
 const row=await db.prepare('SELECT id FROM pane_api_tokens WHERE token_hash=? AND operator_id NOT IN (SELECT id FROM pane_anonymized_people)').bind(await digest(header.slice(7))).first<{id:string}>()
 return row?.id??null
}
export async function recordApi(db:D1Database,identity:ApiIdentity|null,request:Request,status:number){
 const known=['','prepare','autosave','publish','rollback','review','messages/update','messages/reply','messages/erase','people/erase','import/dry-run','import/apply','import/undo','import/crawl-challenge','import/crawl','activity','activity/export','tokens','tokens/create','tokens/revoke','pages','collections','roles','roles/set','roles/invite']
 const path=new URL(request.url).pathname,method=request.method
 const route=path==='/api/pane'?'':path.slice('/api/pane/'.length)
 const actor=identity?.operator.id??null
 await db.prepare(`INSERT INTO pane_activity(actor,action,subject,created_at,agent) VALUES(
  CASE WHEN ? IN (SELECT id FROM pane_anonymized_people) THEN NULL ELSE ? END,?,?,?,?)`)
  .bind(actor,actor,'api.'+(method==='GET'?'GET':method==='POST'?'POST':'OTHER')+'.'+status,'api:'+(known.includes(route)?route||'status':'unknown'),new Date().toISOString(),identity?.tokenId??await presentedTokenId(db,request)).run()
}
