import { followUpDue } from './followups'
import { revision } from './content'
import type { Bindings } from '../auth.server'
export type RejectedContent={id:string;form:string;reason:string;name:string;email:string;message:string;created_at:string;expires_at:number;held:number}
export async function expireRejected(db:D1Database,now=Date.now()){
 await db.prepare('DELETE FROM pane_rejected_content WHERE held=0 AND expires_at<=?').bind(now).run()
}
/** Unavailable workspace storage must never cause rejected answers to be kept elsewhere. */
export async function retainRejected(env:Bindings,form:string,reason:string,fields:FormData){
 const id=String(fields.get('idempotency')??''),name=String(fields.get('name')??'').trim(),email=String(fields.get('email')??'').trim(),message=String(fields.get('message')??'').trim()
 if(!/^[a-f0-9-]{36}$/.test(id)||!name||name.length>120||(email!==''&&!/^\S+@\S+\.\S+$/.test(email))||email.length>254||!message||message.length>5000)return
 const received=Date.now()
 try{
  await expireRejected(env.DB)
  await env.DB.prepare(`INSERT OR IGNORE INTO pane_rejected_content(id,form,reason,name,email,message,created_at,expires_at)
   SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM pane_spam_settings WHERE id=1 AND enabled=1)
   AND NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?) AND NOT EXISTS(SELECT 1 FROM pane_messages WHERE id=?)`)
   .bind(id,form,reason,name,email,message,new Date(received).toISOString(),received+30*86400000,id,id).run()
 }catch{ /* Keep only the rejection metadata when workspace storage is unavailable. */ }
}
export async function reviewRejected(db:D1Database){
 await expireRejected(db)
 return (await db.prepare('SELECT * FROM pane_rejected_content ORDER BY created_at DESC,id DESC LIMIT 100').all<RejectedContent>()).results
}
export async function changeRejected(db:D1Database,action:string,input:Record<string,unknown>){
 if(action==='settings'){
  if(input.confirm!=='change-retention'||!['on','off'].includes(String(input.enabled)))throw Error('Confirm the retention setting explicitly.')
  await db.prepare('UPDATE pane_spam_settings SET enabled=? WHERE id=1').bind(input.enabled==='on'?1:0).run()
  return {saved:true}
 }
 const id=String(input.id??'')
 if(action==='hold'||action==='release'){
  if(input.confirm!==action+'-rejected')throw Error('Confirm the legal hold change explicitly.')
  await expireRejected(db)
  const row=await db.prepare('UPDATE pane_rejected_content SET held=? WHERE id=? RETURNING id').bind(action==='hold'?1:0,id).first()
  if(!row)throw Error('Retained rejection not found.')
  await expireRejected(db)
  return {saved:true}
 }
 if(action!=='rescue'&&action!=='purge')throw Error('Unknown rejection action.')
 if(input.confirm!==action+'-rejected')throw Error('Confirm the rejection action explicitly.')
 await expireRejected(db)
 const row=await db.prepare('SELECT * FROM pane_rejected_content WHERE id=?').bind(id).first<RejectedContent>()
 if(!row)throw Error('Retained rejection not found.')
 if(row.held)throw Error('Release the legal hold before rescue, purge or person erasure.')
 // Eligibility is repeated inside the transaction so a concurrent hold wins.
 const statements=[db.prepare(`UPDATE pane_audit_context SET valid=CASE WHEN EXISTS(SELECT 1 FROM pane_rejected_content WHERE id=? AND held=0 AND expires_at>?) THEN 1 ELSE 0 END WHERE id=1`).bind(id,Date.now())]
 const live=action==='rescue'?await db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first():null
 if(action==='rescue')statements.push(db.prepare(`INSERT OR IGNORE INTO pane_messages(id,name,email,message,created_at,acknowledgment_status,follow_up_at)
  SELECT id,name,email,message,created_at,'not_requested',? FROM pane_rejected_content WHERE id=? AND NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?)`).bind(followUpDue(live?revision(live).site:null,Date.parse(row.created_at)),id,id))
 // A value-free receipt prevents a purged submission being captured again.
 if(action==='purge')statements.push(db.prepare('INSERT OR IGNORE INTO pane_erased_messages(id,created_at) VALUES(?,?)').bind(id,new Date().toISOString()))
 statements.push(db.prepare("INSERT INTO pane_activity(actor,action,subject,created_at) SELECT actor,?,'rejection:'||?,? FROM pane_audit_context WHERE id=1").bind('spam.'+action,id,new Date().toISOString()))
 statements.push(db.prepare('DELETE FROM pane_rejected_content WHERE id=? AND held=0').bind(id))
 await db.batch(statements)
 return {processed:true}
}
