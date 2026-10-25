import { wireDatabase } from '@runeditrun/rer/internal/modules/d1-transport/index.mjs'
import { erasureStatements,invalidateTransfersStatements } from '@runeditrun/rer/internal/modules/portability/journal.mjs'
/** Request-local attribution is installed and removed inside each D1 transaction.
 * Triggers therefore record the successful change atomically, without modifying
 * Base copies or allowing concurrent requests to borrow another actor. */
export function auditedDatabase(db: D1Database, actor: string | null, action: string): D1Database {
 const originals = new WeakMap<object, D1PreparedStatement>()
 const transact = async (statements: D1PreparedStatement[]) => {
  const results = await db.batch<Record<string, unknown>>([
   db.prepare('INSERT INTO pane_audit_context(id,actor,action) VALUES(1,?,?)').bind(actor,action),
   ...statements.map(s=>originals.get(s)??s),
   db.prepare('DELETE FROM pane_audit_context WHERE id=1'),
  ])
  return results.slice(1,-1)
 }
 const wrap = (statement: D1PreparedStatement, sql: string): D1PreparedStatement => {
  const mutation = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql)
  const proxy = new Proxy(statement, {get(target,key) {
   if(key==='bind')return (...values: unknown[])=>wrap(target.bind(...values),sql)
   if(mutation && ['run','all','first','raw'].includes(String(key)))return async (option?: string | {columnNames?: boolean})=>{
    const [result]=await transact([target])
    if(key==='first')return typeof option==='string' ? result.results[0]?.[option]??null : result.results[0]??null
    if(key==='raw') { const rows=result.results.map(row=>Object.values(row)); return typeof option==='object'&&option.columnNames ? [Object.keys(result.results[0]??{}),...rows] : rows }
    return result
   }
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value
  }})
  originals.set(proxy,statement);return proxy
 }
 return new Proxy(db,{get(target,key){
  if(key==='prepare')return (sql:string)=>wrap(target.prepare(sql),sql)
  if(key==='batch')return transact
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value
 }})
}
export type Activity = {sequence:number;action:string;subject:string;created_at:string;actor:string;agent:string|null}
export async function activity(db:D1Database) {
 return (await db.prepare(`SELECT a.sequence,a.action,a.subject,a.created_at,a.agent,
  CASE WHEN a.actor IS NULL THEN 'Former person or system' ELSE COALESCE(o.display_name,'Former person') END AS actor
  FROM pane_activity a LEFT JOIN oa_operators o ON o.id=a.actor ORDER BY a.sequence`).all<Activity>()).results
}
/** Erase an inactive/non-owner person's identifying account data and history attribution.
 * Native last-owner protection and the shared old-archive erasure checkpoint remain intact. */
export async function erasePerson(db:D1Database,id:string,confirm:unknown) {
 if(confirm!=='erase-person')throw Error('Explicit erase-person confirmation required.')
 const person=await db.prepare("SELECT id FROM oa_operators WHERE id=? AND role!='owner'").bind(id).first()
 if(!person)throw Error('Choose a non-owner person.')
 const wire=wireDatabase(db)
 await db.batch([
  ...await erasureStatements(wire,'rer_portability_state',{id:1}),...await invalidateTransfersStatements(wire),
  db.prepare(`UPDATE pane_audit_context SET valid=CASE WHEN EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role!='owner')
   AND EXISTS(SELECT 1 FROM oa_operators WHERE id=pane_audit_context.actor AND role='owner' AND status='active') THEN 1 ELSE 0 END WHERE id=1`).bind(id),
  db.prepare('INSERT OR IGNORE INTO pane_anonymized_people(id) VALUES(?)').bind(id),
  db.prepare('UPDATE pane_activity SET actor=NULL,agent=NULL WHERE actor=? OR agent IN (SELECT id FROM pane_api_tokens WHERE operator_id=?)').bind(id,id),
  db.prepare("UPDATE pane_activity SET subject='erased-person' WHERE subject=?").bind('person:'+id),
  db.prepare("UPDATE oa_operators SET email=?,display_name='Former person',status='inactive' WHERE id=? AND role!='owner'").bind(id+'@erased.invalid',id),
  db.prepare('UPDATE pane_api_tokens SET revoked_at=COALESCE(revoked_at,?) WHERE operator_id=?').bind(Date.now(),id),
  db.prepare('DELETE FROM oa_external_identities WHERE operator_id=?').bind(id),
  db.prepare('UPDATE oa_sessions SET revoked_at=COALESCE(revoked_at,?) WHERE operator_id=?').bind(Date.now(),id),
  db.prepare('UPDATE oa_tokens SET revoked_at=COALESCE(revoked_at,?) WHERE operator_id=? OR issuer_id=?').bind(Date.now(),id,id),
 ])
 return {erased:true}
}
