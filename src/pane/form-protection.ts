import type { Submission } from './submission-export'
import { fetchDemoRead } from '../modules/demo/index.mjs'
import { liveCall } from './outage'
import { retainRejected } from './rejected-content'
import type { Bindings } from '../auth.server'
export async function formBinding(form:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(form))),byte=>byte.toString(16).padStart(2,'0')).join('')}
export type FormRejection = {id:string;form:string;reason:string;created_at:string}
export async function rejectForm(env:Bindings,form:string,reason:FormRejection['reason'],fields?:FormData,submission?:Submission) {
 if(env.PANE_LIVE)await liveCall(env,'/reject',{form,reason})
 else await env.DB.prepare('INSERT INTO pane_form_rejections(id,form,reason,created_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),form,reason,new Date().toISOString()).run()
 if(fields)await retainRejected(env,form,reason,fields,submission)
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

export async function limited(db:D1Database,key:string,limit:number) {
 const minute = new Date().toISOString().slice(0,16)
 // Only this minute's counts matter, so earlier buckets are dropped as each count is taken.
 const [,r]=await db.batch<{count:number}>([
  db.prepare('DELETE FROM pane_rate_limits WHERE bucket<?').bind(minute),
  db.prepare('INSERT INTO pane_rate_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count').bind(`${minute}:${key}`),
 ])
 return (r?.results[0]?.count??limit+1)>limit
}
/** Each visitor has its own quota per form under a form-wide emergency ceiling; retrying a stored or erased enquiry spends neither. */
export async function contactLimited(db:D1Database,form:string,visitor:string,id:string) {
 if(await db.prepare('SELECT 1 FROM pane_messages WHERE id=? UNION ALL SELECT 1 FROM pane_erased_messages WHERE id=?').bind(id,id).first())return false
 return await limited(db,`contact-visitor:${visitor}:${form}`,20)||await limited(db,'contact:'+form,200)
}
/** The visitor a quota belongs to: Cloudflare's client address, an IPv6 address reduced to the /64
 * one subscriber holds, kept only as a keyed digest so no address is stored. */
export async function visitor(request:Request,secret:string) {
 const ip=(request.headers.get('CF-Connecting-IP')??'').toLowerCase()
 let network=ip
 if(ip.includes(':')&&!ip.includes('.')) {
  const [head,tail]=ip.split('::'),left=head?head.split(':'):[],right=tail?tail.split(':'):[]
  const groups=tail===undefined?left:[...left,...Array(Math.max(0,8-left.length-right.length)).fill('0'),...right]
  network=groups.slice(0,4).map(group=>group.replace(/^0+(?=.)/,'')).join(':')+'::/64'
 }
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('contact\0'+network))),b=>b.toString(16).padStart(2,'0')).join('')
}
