import { fetchDemoRead } from '../modules/demo/index.mjs'
import { liveCall } from './outage'
import type { Bindings } from '../auth.server'
export async function formBinding(form:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(form))),byte=>byte.toString(16).padStart(2,'0')).join('')}
export type FormRejection = {id:string;form:string;reason:string;created_at:string}
export async function rejectForm(env:Bindings,form:string,reason:FormRejection['reason']) {
 if(env.PANE_LIVE)await liveCall(env,'/reject',{form,reason})
 else await env.DB.prepare('INSERT INTO pane_form_rejections(id,form,reason,created_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),form,reason,new Date().toISOString()).run()
 const unavailable=reason==='unavailable'
 return Response.json({error:unavailable?'Message not sent. Verification is unavailable; please try again later.':reason==='rate'?'Message not sent. Please try again in a minute.':'Message not sent. Spam verification failed; please try again.'},{status:unavailable?503:reason==='rate'?429:403,headers:{'cache-control':'no-store'}})
}
/** The provider validates the token; the installation also binds it to its host and form. */
export async function verifyForm(env:Bindings,token:string,id:string,form:string):Promise<'verified'|'turnstile'|'unavailable'> {
 if(!env.TURNSTILE_SITE_KEY||!env.TURNSTILE_SECRET)return 'unavailable'
 if(!token||token.length>2048)return 'turnstile'
 try {
  const response=await fetchDemoRead('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token,idempotency_key:id}),signal:AbortSignal.timeout(8000)})
  if(!response.ok)return 'unavailable'
  const result=await response.json() as {success?:boolean;hostname?:string;action?:string;cdata?:string}
  return result.success===true&&result.hostname===new URL(env.AUTH_ORIGIN).hostname&&result.action==='pane-contact'&&result.cdata===await formBinding(form)?'verified':'turnstile'
 }catch{return 'unavailable'}
}
