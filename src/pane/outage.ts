import { DurableObject } from 'cloudflare:workers'
import type { Bindings } from '../auth.server'
import type { Revision } from './model'
import { publish } from './content'
import { auditedDatabase } from './audit'
import { deliverAcknowledgment } from './acknowledgment'
import { recordGoal } from './goal-data'
import type { VisitDimensions } from './visit-dimensions'
import type { FormRejection } from './form-protection'
export type QueuedEnquiry={id:string;name:string;email:string;message:string;received:string;acknowledgment:unknown;followUp:number;goals:{id:string;page:string}[];dimensions:VisitDimensions}
export function liveStore(env:Bindings){if(!env.PANE_LIVE)throw Error('Live storage is not configured.');return env.PANE_LIVE.get(env.PANE_LIVE.idFromName('published-site'))}
export async function liveSnapshot(env:Bindings):Promise<(Revision&{banners?:{text:string}[]})|null>{
 const response=await liveStore(env).fetch('https://pane.internal/live')
 if(response.status===404)return null
 if(!response.ok)throw Error('Published snapshot unavailable.')
 return response.json()
}
export async function liveCall(env:Bindings,path:string,value:unknown){
 const response=await liveStore(env).fetch('https://pane.internal'+path,{method:'POST',body:JSON.stringify(value)})
 const result=await response.json() as any
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
  if(path==='/publish')return this.ctx.blockConcurrencyWhile(async()=>{
   const db=auditedDatabase(this.env.DB,input.actor,'workspace.change')
   const live=await publish(db,input.actor,input.id,input.action)
   await storage.put({live,banners:[]})
   return Response.json(live)
  })
  if(path==='/banners'){await storage.put('banners',input.banners);return Response.json({saved:true})}
  if(path==='/rate'){
   const limited=await storage.transaction(async tx=>{
    const key='rate:'+new Date().toISOString().slice(0,16)+':'+input.form,count=(await tx.get<number>(key)??0)+1
    await tx.put(key,count)
    return count>20
   })
   return Response.json({limited})
  }
  if(path==='/reject'){
   const row:FormRejection={id:crypto.randomUUID(),form:input.form,reason:input.reason,created_at:new Date().toISOString()}
   await storage.transaction(async tx=>{await tx.put('rejection:'+row.created_at+':'+row.id,row);await tx.put('rejection-count',(await tx.get<number>('rejection-count')??0)+1)})
   return Response.json({counted:true})
  }
  if(path==='/accept'){
   const message=input as QueuedEnquiry
   await storage.transaction(async tx=>{
    if(!await tx.get('receipt:'+message.id)){
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
    const stored=await db.prepare('INSERT OR IGNORE INTO pane_messages(id,name,email,message,created_at,acknowledgment,acknowledgment_status,follow_up_at) SELECT ?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM pane_erased_messages WHERE id=?)').bind(message.id,message.name,message.email,message.message,message.received,message.acknowledgment?JSON.stringify(message.acknowledgment):null,message.acknowledgment?'pending':'not_requested',message.followUp,message.id).run()
    if(stored.meta.changes)for(const goal of message.goals)await recordGoal(db,goal.id,goal.page,message.dimensions)
    await deliverAcknowledgment({...this.env,DB:db},message.id)
    // D1 primary-key and erasure fences make a crash before this deletion safe.
    await storage.delete(key)
   }
   // Per-minute counters are operational state; keep only the current window.
   const current='rate:'+new Date().toISOString().slice(0,16)
   for(const key of (await storage.list({prefix:'rate:'})).keys())if(!key.startsWith(current))await storage.delete(key)
   return Response.json({drained:queued.size})
  })
  return new Response(null,{status:404})
 }
}
