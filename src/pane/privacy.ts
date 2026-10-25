import { expireRejected } from './rejected-content'
import { wireDatabase } from '@runeditrun/rer/internal/modules/d1-transport/index.mjs'
import { erasureStatements,invalidateTransfersStatements } from '@runeditrun/rer/internal/modules/portability/journal.mjs'
import type { QueuedEnquiry } from './outage'
export const personEmail=(value:unknown)=>{
 const email=typeof value==='string'?value.trim().toLowerCase():''
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw Error('Enter the person’s complete email address.')
 return email
}
export async function findPersonData(db:D1Database,email:string,queued:QueuedEnquiry[]=[]){
 await expireRejected(db)
 const rejected=(await db.prepare('SELECT * FROM pane_rejected_content WHERE lower(trim(email))=? ORDER BY created_at,id').bind(email).all<import('./rejected-content').RejectedContent>()).results
 const messages=(await db.prepare('SELECT * FROM pane_messages WHERE lower(trim(email))=? ORDER BY created_at,id').bind(email).all<Record<string,any>>()).results
 const accounts=(await db.prepare('SELECT id,email,display_name,role,status,version,created_at FROM oa_operators WHERE lower(trim(email))=? ORDER BY id').bind(email).all<Record<string,any>>()).results
 const ids=JSON.stringify(messages.map(message=>message.id)),people=JSON.stringify(accounts.map(account=>account.id))
 const replies=(await db.prepare('SELECT id,message_id,subject,body,status,created_at FROM pane_inquiry_replies WHERE message_id IN (SELECT value FROM json_each(?)) ORDER BY created_at,id').bind(ids).all<Record<string,any>>()).results
 const activity=(await db.prepare('SELECT sequence,action,subject,created_at FROM pane_activity WHERE actor IN (SELECT value FROM json_each(?)) ORDER BY sequence').bind(people).all()).results
 const roles=(await db.prepare('SELECT operator_id,roles,changed_at FROM pane_roles WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people).all()).results
 const externalIdentities=(await db.prepare('SELECT operator_id,issuer,subject FROM oa_external_identities WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people).all()).results
 const credentials=(await db.prepare('SELECT id,name,operator_id,scopes,created_at,expires_at,revoked_at FROM pane_api_tokens WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people).all()).results
 const sessions=(await db.prepare('SELECT id,operator_id,kind,created_at,expires_at,revoked_at FROM oa_sessions WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people).all()).results
 const signInLinks=(await db.prepare('SELECT id,operator_id,kind,created_at,expires_at,consumed_at,revoked_at FROM oa_tokens WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people).all()).results
 const nativeCredentials=(await db.prepare('SELECT id,operator_id,kind,expires_at,revoked_at FROM oa_credentials WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people).all()).results
 const pending=queued.filter(message=>message.email.trim().toLowerCase()===email)
 const downstream=messages.flatMap(message=>message.acknowledgment_provider?[{service:String(message.acknowledgment_provider),kind:'acknowledgment',messageId:message.id,status:message.acknowledgment_status,receipt:message.acknowledgment_provider_id??null}]:[])
 return {version:1,email,rejected,messages,replies,queued:pending,accounts,roles,externalIdentities,credentials,sessions,signInLinks,nativeCredentials,activity,downstream,crmDeliveries:[],notHeld:['Analytics and embed choices are browser-local and are not associated with an email address.','No file, comment, subscriber or CRM storage door exists in this installation.'],retainedAfterErasure:['Value-free message replay receipts and portability tombstones.','Anonymized account placeholder and activity metadata.'],canErase:!accounts.some(account=>account.role==='owner')}
}
export type PersonPrivacy=Awaited<ReturnType<typeof findPersonData>>
/** All current rows are one guarded D1 batch. A concurrent new record aborts the
 * batch; the owner must rediscover before erasing. Queued IDs are fenced too. */
export async function erasePersonData(db:D1Database,email:string,confirm:unknown,actor:{id:string;version:number;sessionId?:string},queued:QueuedEnquiry[]=[]){
 if(confirm!=='erase-person-data')throw Error('Confirm erase-person-data explicitly.')
 const found=await findPersonData(db,email,queued)
 if(!found.canErase)throw Error('Transfer ownership before erasing an owner account. Nothing was erased.')
 if(found.rejected.some(row=>row.held))throw Error('Release the legal hold before person erasure. Nothing was erased.')
 const wire=wireDatabase(db),messageIds=[...new Set([...found.rejected.map(row=>row.id),...found.messages.map(row=>row.id),...found.queued.map(row=>row.id)])],ids=JSON.stringify(found.messages.map(row=>row.id)),people=JSON.stringify(found.accounts.map(row=>row.id)),now=Date.now()
 const statements:any[]=[
  wire.prepare(`UPDATE pane_audit_context SET valid=CASE WHEN
   EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND version=? AND role='owner' AND status='active')
   AND EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id WHERE s.id=? AND s.operator_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND s.operator_version=o.version AND (s.kind!='oidc' OR EXISTS(SELECT 1 FROM oa_provider_sessions p JOIN oa_auth_settings a ON a.singleton=1 AND a.idp_sign_in=1 AND a.generation=p.generation WHERE p.session_id=s.id)))
   AND NOT EXISTS(SELECT 1 FROM pane_rejected_content WHERE lower(trim(email))=? AND held=1)
   AND (SELECT COUNT(*) FROM pane_rejected_content WHERE lower(trim(email))=?)=?
   AND NOT EXISTS(SELECT 1 FROM pane_rejected_content WHERE lower(trim(email))=? AND id NOT IN (SELECT value FROM json_each(?)))
   AND (SELECT COUNT(*) FROM pane_messages WHERE lower(trim(email))=?)=?
   AND NOT EXISTS(SELECT 1 FROM pane_messages WHERE lower(trim(email))=? AND id NOT IN (SELECT value FROM json_each(?)))
   AND (SELECT COUNT(*) FROM pane_inquiry_replies WHERE message_id IN (SELECT value FROM json_each(?)))=?
   AND (SELECT COUNT(*) FROM oa_operators WHERE lower(trim(email))=?)=?
   AND NOT EXISTS(SELECT 1 FROM oa_operators o JOIN json_each(?) j ON o.id=json_extract(j.value,'$.id') WHERE o.version!=json_extract(j.value,'$.version') OR o.role='owner')
   THEN 1 ELSE 0 END WHERE id=1`).bind(actor.id,actor.version,actor.sessionId??'',actor.id,Date.now(),email,email,found.rejected.length,email,JSON.stringify(found.rejected.map(row=>row.id)),email,found.messages.length,email,ids,ids,found.replies.length,email,found.accounts.length,JSON.stringify(found.accounts)),
 ]
 for(const id of messageIds)statements.push(...await erasureStatements(wire,'pane_messages',{id}),wire.prepare('INSERT OR IGNORE INTO pane_erased_messages(id,created_at) VALUES(?,?)').bind(id,new Date(now).toISOString()))
 for(const reply of found.replies)statements.push(...await erasureStatements(wire,'pane_inquiry_replies',{id:reply.id}))
 // A retained anonymized account/activity row cannot carry a row tombstone: the
 // shared redaction checkpoint refuses older archives while newer ones restore.
 statements.push(...await erasureStatements(wire,'rer_portability_state',{id:1}),...await invalidateTransfersStatements(wire),
  wire.prepare('DELETE FROM pane_rejected_content WHERE lower(trim(email))=?').bind(email),
  wire.prepare('DELETE FROM pane_messages WHERE id IN (SELECT value FROM json_each(?))').bind(ids),
  wire.prepare('INSERT OR IGNORE INTO pane_anonymized_people(id) SELECT value FROM json_each(?)').bind(people),
  wire.prepare('UPDATE pane_activity SET actor=NULL,agent=NULL WHERE actor IN (SELECT value FROM json_each(?)) OR agent IN (SELECT id FROM pane_api_tokens WHERE operator_id IN (SELECT value FROM json_each(?)))').bind(people,people),
  wire.prepare("UPDATE pane_activity SET subject='erased-person' WHERE subject IN (SELECT 'person:'||value FROM json_each(?))").bind(people),
  wire.prepare("UPDATE pane_inquiry_replies SET actor='erased-person' WHERE actor IN (SELECT value FROM json_each(?))").bind(people),
  wire.prepare("UPDATE oa_operators SET email=id||'@erased.invalid',display_name='Former person',status='inactive' WHERE id IN (SELECT value FROM json_each(?)) AND role!='owner'").bind(people),
  wire.prepare('DELETE FROM oa_provider_session_pins WHERE session_id IN (SELECT id FROM oa_sessions WHERE operator_id IN (SELECT value FROM json_each(?)))').bind(people),
  wire.prepare('DELETE FROM oa_provider_sessions WHERE session_id IN (SELECT id FROM oa_sessions WHERE operator_id IN (SELECT value FROM json_each(?)))').bind(people),
  wire.prepare('DELETE FROM oa_credentials WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people),
  wire.prepare('DELETE FROM oa_step_up_challenges WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people),
  wire.prepare('DELETE FROM oa_external_identities WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people),
  wire.prepare('DELETE FROM pane_roles WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people),
  wire.prepare('DELETE FROM pane_api_tokens WHERE operator_id IN (SELECT value FROM json_each(?))').bind(people),
  wire.prepare('UPDATE oa_sessions SET revoked_at=COALESCE(revoked_at,?) WHERE operator_id IN (SELECT value FROM json_each(?))').bind(now,people),
  wire.prepare('UPDATE oa_tokens SET revoked_at=COALESCE(revoked_at,?) WHERE operator_id IN (SELECT value FROM json_each(?)) OR issuer_id IN (SELECT value FROM json_each(?))').bind(now,people,people),
 )
 await wire.batch(statements)
 return {erasedMessages:messageIds.length,erasedReplies:found.replies.length,anonymizedAccounts:found.accounts.length,downstream:found.downstream,crmDeliveries:found.crmDeliveries,backupFence:true,retained:found.retainedAfterErasure}
}
