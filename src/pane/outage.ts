import {publishCollectionItem} from './collection-store'
import {publishPage} from './page-review'
import {runPostSchedules} from './post-schedules'
import {publishPost,PostDenied} from './posts'
import { uploadStatements,type Upload } from './forms'
import { findPersonData,erasePersonData } from './privacy'
import { DurableObject } from 'cloudflare:workers'
import type { Bindings } from '../auth.server'
import type { Revision } from './model'
import { publish, revokePublication, DraftConflict } from './content'
import { auditedDatabase } from './audit'
import { deliverAcknowledgment } from './acknowledgment'
import { recordGoal } from './goal-data'
import type { VisitDimensions } from './visit-dimensions'
import type { FormRejection } from './form-protection'
export type QueuedEnquiry={uploads?:Omit<Upload,'chunks'>[];id:string;name:string;email:string;message:string;received:string;acknowledgment:unknown;followUp:number;goals:{id:string;page:string}[];dimensions:VisitDimensions}
export function liveStore(env:Bindings){if(!env.PANE_LIVE)throw Error('Live storage is not configured.');return env.PANE_LIVE.get(env.PANE_LIVE.idFromName('published-site'))}
export async function liveSnapshot(env:Bindings):Promise<(Revision&{banners?:{text:string}[]})|null>{
 const response=await liveStore(env).fetch('https://pane.internal/live')
 if(response.status===404){const seeded=await liveStore(env).fetch('https://pane.internal/seed',{method:'POST',body:'{}'});if(seeded.status===404)return null;if(!seeded.ok)throw Error('Published snapshot unavailable.');return seeded.json()}
 if(!response.ok)throw Error('Published snapshot unavailable.')
 return response.json()
}
export async function liveCall(env:Bindings,path:string,value:unknown){
 const response=await liveStore(env).fetch('https://pane.internal'+path,{method:'POST',body:JSON.stringify(value)})
 const result=await response.json() as any
 if(['/post-publish','/page-publish'].includes(path)&&response.status===409)throw new DraftConflict(result.latest??null)
 if(['/post-publish','/item-publish'].includes(path)&&response.status===403)throw new PostDenied(result.error??'Post publication refused.')
 if(!response.ok)throw Error(result.error??'Live storage unavailable.')
 return result
}
/** Independent durable storage: only a Worker binding can call these methods.
 * No private control endpoint is exposed by the installation's HTTP router. */
export class PaneLive extends DurableObject<Bindings>{
 async fetch(request:Request){
  const path=new URL(request.url).pathname,storage=this.ctx.storage
  if(path==='/live'&&request.method==='GET'){
   const live=await storage.get<Revision>('live')
   return live?Response.json({...live,banners:await storage.get('banners')??[]}):new Response(null,{status:404})
  }
  if(path==='/review'&&request.method==='GET')return Response.json({formRejections:[...(await storage.list<FormRejection>({prefix:'rejection:',reverse:true,limit:100})).values()],formRejectionCount:await storage.get<number>('rejection-count')??0})
  if(request.method!=='POST')return new Response(null,{status:405})
  const input=await request.json() as any
  if(path==='/seed')return this.ctx.blockConcurrencyWhile(async()=>{
   let live=await storage.get<Revision>('live')
   if(!live){const row=await this.env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first();if(row){live={...row,site:JSON.parse(String(row.site))} as Revision;await storage.put('live',live)}}
   return live?Response.json(live):new Response(null,{status:404})
  })
  if(path==='/privacy/find'||path==='/privacy/erase')return this.ctx.blockConcurrencyWhile(async()=>{
   const queued=[...(await storage.list<QueuedEnquiry>({prefix:'message:'})).values()]
   const db=auditedDatabase(this.env.DB,input.actor.id,'privacy.erasure')
   if(path==='/privacy/find'){const found=await findPersonData(db,input.email,queued);const pendingFiles=await Promise.all(queued.filter(message=>message.email.trim().toLowerCase()===input.email).flatMap(message=>(message.uploads??[]).map(async file=>({...file,chunks:[...(await storage.list<string>({prefix:'file:'+file.id+':'})).entries()].sort(([a],[b])=>Number(a.split(':').at(-1))-Number(b.split(':').at(-1))).map(([,value])=>value)}))));return Response.json({...found,pendingFiles})}
   const result=await erasePersonData(db,input.email,input.confirm,input.actor,queued)
   for(const message of queued)if(message.email.trim().toLowerCase()===input.email){await storage.delete('message:'+message.id);for(const file of message.uploads??[])for(const chunk of (await storage.list({prefix:'file:'+file.id+':'})).keys())await storage.delete(chunk)}
   return Response.json(result)
  })
  if(path==='/revoke')return this.ctx.blockConcurrencyWhile(async()=>{
   const result=await revokePublication(auditedDatabase(this.env.DB,input.actor,'workspace.change'),input.actor,input.id,input.confirm)
   const live=await storage.get<Revision>('live')
   if(live?.id===input.id)await storage.delete('live')
   return Response.json(result)
  })
  if(path==='/page-publish')return this.ctx.blockConcurrencyWhile(async()=>{
   try{
    const live=await publishPage(auditedDatabase(this.env.DB,input.actor,'workspace.change'),input.actor,input.base,input.page,input.request)
    await storage.put({live,banners:[]})
    return Response.json(live)
   }catch(error){
    if(error instanceof DraftConflict)return Response.json({error:error.message,latest:error.latest},{status:409})
    return Response.json({error:error instanceof Error?error.message:'Page publication failed.'},{status:400})
   }
  })
  if(path==='/post-schedules')return this.ctx.blockConcurrencyWhile(async()=>{
   await runPostSchedules(auditedDatabase(this.env.DB,null,'schedule.change'),input.now)
   const row=await this.env.DB.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first()
   if(row)await storage.put('live',{...row,site:JSON.parse(String(row.site))})
   return Response.json({processed:true})
  })
  if(path==='/post-publish')return this.ctx.blockConcurrencyWhile(async()=>{
   try{
    const live=await publishPost(auditedDatabase(this.env.DB,input.actor.id,'workspace.change'),input.actor,input)
    await storage.put({live,banners:[]})
    return Response.json(live)
   }catch(error){
    if(error instanceof DraftConflict)return Response.json({error:error.message,latest:error.latest},{status:409})
    return Response.json({error:error instanceof Error?error.message:'Post publication failed.'},{status:error instanceof PostDenied?403:400})
   }
  })
  if(path==='/item-publish')return this.ctx.blockConcurrencyWhile(async()=>{
   try{const live=await publishCollectionItem(auditedDatabase(this.env.DB,input.actor.id,'workspace.change'),input.actor.id,input);await storage.put({live,banners:[]});return Response.json(live)}
   catch(error){if(error instanceof DraftConflict)return Response.json({error:error.message,latest:error.latest},{status:409});return Response.json({error:error instanceof Error?error.message:'Item publication failed.'},{status:error instanceof PostDenied?403:400})}
  })
  if(path==='/publish')return this.ctx.blockConcurrencyWhile(async()=>{
   const db=auditedDatabase(this.env.DB,input.actor,'workspace.change')
   const live=await publish(db,input.actor,input.id,input.action)
   await storage.put({live,banners:[]})
   return Response.json(live)
  })
  if(path==='/banners'){await storage.put('banners',input.banners);return Response.json({saved:true})}
  if(path==='/rate'){
   const limited=await storage.transaction(async tx=>{
    // Retrying an accepted enquiry spends no quota; each visitor has its own count under the form-wide emergency ceiling.
    if(await tx.get('receipt:'+input.id))return false
    const key='rate:'+new Date().toISOString().slice(0,16)+':'+input.form,own=key+':visitor:'+input.visitor
    const count=(await tx.get<number>(own)??0)+1
    await tx.put(own,count)
    if(count>20)return true
    const total=(await tx.get<number>(key)??0)+1
    await tx.put(key,total)
    return total>200
   })
   return Response.json({limited})
  }
  if(path==='/reject'){
   const row:FormRejection={id:crypto.randomUUID(),form:input.form,reason:input.reason,created_at:new Date().toISOString()}
   await storage.transaction(async tx=>{await tx.put('rejection:'+row.created_at+':'+row.id,row);await tx.put('rejection-count',(await tx.get<number>('rejection-count')??0)+1)})
   return Response.json({counted:true})
  }
  if(path==='/accept'){
   const files=(input.uploads??[]) as Upload[]
   const message={...input,uploads:files.map(({chunks,...file})=>file)} as QueuedEnquiry
   await storage.transaction(async tx=>{
    if(!await tx.get('receipt:'+message.id)){
     for(const file of files)for(const [index,data] of file.chunks.entries())await tx.put('file:'+file.id+':'+index,data)
     await tx.put('message:'+message.id,message)
     await tx.put('receipt:'+message.id,true)
    }
   })
   return Response.json({queued:true})
  }
  if(path==='/drain')return this.ctx.blockConcurrencyWhile(async()=>{
   const queued=await storage.list<QueuedEnquiry>({prefix:'message:',limit:100})
   const db=auditedDatabase(this.env.DB,null,'enquiry.delivery')
   for(const [key,message] of queued){
    const uploads=await Promise.all((message.uploads??[]).map(async file=>({...file,chunks:[...(await storage.list<string>({prefix:'file:'+file.id+':'})).entries()].sort(([a],[b])=>Number(a.split(':').at(-1))-Number(b.split(':').at(-1))).map(([,value])=>value)})))
    const statement=db.prepare('INSERT OR IGNORE INTO pane_messages(id,name,email,message,created_at,acknowledgment,acknowledgment_status,follow_up_at) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?)').bind(message.id,message.name,message.email,message.message,message.received,message.acknowledgment?JSON.stringify(message.acknowledgment):null,message.acknowledgment?'pending':'not_requested',message.followUp,message.id)
    const [stored]=await db.batch([statement,...uploadStatements(db,message.id,message.message,uploads)])
    if(stored.meta.changes)for(const goal of message.goals)await recordGoal(db,goal.id,goal.page,message.dimensions)
    await deliverAcknowledgment({...this.env,DB:db},message.id)
    // D1 primary-key and erasure fences make a crash before this deletion safe.
    await storage.delete(key)
    for(const file of message.uploads??[])for(const chunk of (await storage.list({prefix:'file:'+file.id+':'})).keys())await storage.delete(chunk)
   }
   // Per-minute counters are operational state; keep only the current window.
   const current='rate:'+new Date().toISOString().slice(0,16)
   for(const key of (await storage.list({prefix:'rate:'})).keys())if(!key.startsWith(current))await storage.delete(key)
   return Response.json({drained:queued.size})
  })
  return new Response(null,{status:404})
 }
}
