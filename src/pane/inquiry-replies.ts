import { escape } from './ui/kit'
import type { Bindings } from '../auth.server'
import { operatorMail } from '../mail.server.mjs'
/** Explicit, idempotent user send. A crash after provider acceptance remains
 * sending/uncertain and is never automatically replayed. */
export async function replyToInquiry(env:Bindings,actor:string,input:Record<string,unknown>){
 const id=String(input.id??''),replyId=String(input.idempotency??'')
 if(!/^[0-9a-f-]{36}$/i.test(replyId)||input.confirm!=='send-reply')throw Error('Confirm this reply explicitly with a unique idempotency key.')
 if(typeof input.subject!=='string'||!input.subject.trim()||input.subject.length>200||/[\r\n]/.test(input.subject)||typeof input.body!=='string'||!input.body.trim()||input.body.length>10000)throw Error('Provide a subject and reply text (up to 10,000 characters).')
 const message=await env.DB.prepare('SELECT email FROM pane_messages WHERE id=?').bind(id).first<{email:string}>()
 if(!message)throw Error('Enquiry not found.')
 const existing=await env.DB.prepare('SELECT id,message_id,actor,subject,body,status FROM pane_inquiry_replies WHERE id=?').bind(replyId).first<{id:string;message_id:string;actor:string;subject:string;body:string;status:string}>()
 if(existing){
  if(existing.message_id!==id||existing.actor!==actor||existing.subject!==input.subject.trim()||existing.body!==input.body.trim())throw Error('This reply key already belongs to a different reply.')
  return {id:replyId,status:existing.status}
 }
 const inserted=await env.DB.prepare(`INSERT INTO pane_inquiry_replies(id,message_id,actor,subject,body,status,created_at)
  VALUES(?,?,?,?,?,'sending',?) ON CONFLICT(id) DO NOTHING RETURNING id`).bind(replyId,id,actor,input.subject.trim(),input.body.trim(),new Date().toISOString()).first()
 if(!inserted){
  const winner=await env.DB.prepare('SELECT message_id,actor,subject,body,status FROM pane_inquiry_replies WHERE id=?').bind(replyId).first<{message_id:string;actor:string;subject:string;body:string;status:string}>()
  if(!winner||winner.message_id!==id||winner.actor!==actor||winner.subject!==input.subject.trim()||winner.body!==input.body.trim())throw Error('This reply key already belongs to a different reply.')
  return {id:replyId,status:winner.status}
 }
 let status:'accepted'|'suppressed'|'failed'|'uncertain'='failed'
 try{
  const sender=operatorMail(env)
  if(!sender)throw Object.assign(Error('Mail is not configured.'),{name:'MailValidationError'})
  const sent=await sender.send({deliveryId:'pane-reply:'+replyId,from:env.MAIL_FROM??'',to:[message.email],subject:input.subject.trim(),text:input.body.trim(),html:'<p>'+escape(input.body.trim()).replaceAll('\n','<br>')+'</p>',headers:{}})
  status=sent.status==='accepted'?'accepted':sent.status==='development'?'suppressed':sent.status==='uncertain'?'uncertain':'failed'
 }catch(error){
  const uncertainResults=['invalid_send_result','invalid_provider_message_id','invalid_result_code','invalid_recipient_results','invalid_recipient_status']
  status=error instanceof Error&&error.name==='MailValidationError'&&(!('code' in error)||!uncertainResults.includes(String(error.code)))?'failed':'uncertain'
 }
 await env.DB.batch([
  env.DB.prepare('UPDATE pane_inquiry_replies SET status=? WHERE id=?').bind(status,replyId),
  env.DB.prepare("UPDATE pane_messages SET status='replied' WHERE id=? AND ?='accepted'").bind(id,status),
 ])
 return {id:replyId,status}
}
