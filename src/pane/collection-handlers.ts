import {adobeResponse} from './adobe-fonts'
import {saveItemSchedule} from './item-schedules'
import type {Bindings} from '../auth.server'
import {dashboardData} from './data'
import {DraftConflict} from './content'
import {latestContent,PostDenied} from './posts'
import {capabilities,permittedDashboard,visibleRevision} from './roles'
import {liveCall} from './outage'
import {collectionTarget,saveCollectionTemplate,saveCollectionSchema,saveCollectionItem,saveCollectionBody,addStarterCollections,publishCollectionItem} from './collection-store'
import {collectionsEditor} from './ui/collections'
import {canvasEditor} from './ui/canvas'
import {shell} from './ui/shell'
import {document} from './views'

export type CollectionActor={id:string;role:string;displayName?:string}
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store'}})
const paths=['','/schema','/template','/items/save','/body','/items/publish','/items/schedule','/starters','/canvas']
const parsed=(value:unknown)=>typeof value==='string'?JSON.parse(value):value
async function inputs(request:Request):Promise<Record<string,unknown>>{
 const input=request.headers.get('content-type')?.includes('application/json')?await request.json():Object.fromEntries(await request.formData())
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Provide collection fields as an object.')
 return input as Record<string,unknown>
}
function allow(input:Record<string,unknown>,fields:string[]){if(Object.keys(input).some(key=>!['base','idempotency',...fields].includes(key)))throw Error('Unsupported collection action field.')}
const destination=(collection:unknown,item?:unknown)=>'/app/collections'+(typeof collection==='string'?'?collection='+encodeURIComponent(collection)+(typeof item==='string'?'&item='+encodeURIComponent(item):''):'')

/** Invoked only after the workspace's native session and origin checks. */
export async function collectionPrivateResponse(request:Request,env:Bindings,actor:CollectionActor,scoped:boolean):Promise<Response|null>{
 const url=new URL(request.url),api=url.pathname.startsWith('/api/pane/'),prefix=api?'/api/pane/collections':'/app/collections'
 if(!url.pathname.startsWith(prefix))return null
 const action=url.pathname.slice(prefix.length)
 if(!paths.includes(action))return null
 const caps=await capabilities(env.DB,actor)
 if(!caps.includes('collections:write')||scoped&&!(api&&action===''&&request.method==='GET'))return json({error:'Collection access is outside your native grants or token scope.'},403)
 const person=await env.DB.prepare("SELECT id,role,display_name FROM oa_operators WHERE id=? AND status='active'").bind(actor.id).first<{id:string;role:string;display_name:string}>()
 if(!person||person.role!==actor.role||!['owner','admin','member'].includes(person.role))return json({error:'Active native owner or administrator access is required.'},403)
 try{
  if(request.method==='GET'){
   if(action!==''&&action!=='/canvas')return json({error:'Use POST for this collection action.'},405)
   const current=await latestContent(env.DB)
   if(api&&action==='')return json({base:current?.id??null,collections:current?.site.collections??[]})
   if(api)return json({error:'Collection body editing uses the native workspace.'},404)
   const data=permittedDashboard(await dashboardData(env.DB,person.display_name,person.role,person.id),caps,actor)
   data.draft=visibleRevision(current,caps,actor);data.notice=url.searchParams.get('notice')??undefined
   const collection=url.searchParams.get('collection')??undefined,item=url.searchParams.get('item')??undefined
   if(action==='/canvas'){
    const field=url.searchParams.get('field')??''
    if(!current)throw Error('Save a collection item before editing its description.')
    const selected=collectionTarget(current.site.collections,collection,item)
    if(!selected.item||selected.collection.fields.find(candidate=>candidate.id===field)?.type!=='richText')throw Error('Choose an existing item rich description.')
    return adobeResponse(await document('Collection description',canvasEditor(data,'',undefined,{collection:selected.collection.id,item:selected.item.id,field}),'site'),current.site.styles)
   }
   return document('Collections',shell(data,'collections',collectionsEditor(data,collection,item)))
  }
  if(request.method!=='POST'||!['/schema','/template','/items/save','/body','/items/publish','/items/schedule','/starters'].includes(action))return json({error:'Method not allowed.'},405)
  const input=await inputs(request),db=env.DB
  let result,back='/app/collections'
  if(action==='/schema'){
   allow(input,['id','title','prefix','fields']);result=await saveCollectionSchema(db,actor.id,{...input,fields:parsed(input.fields)});back=destination(input.id)
  }else if(action==='/template'){
   allow(input,['collection','template']);result=await saveCollectionTemplate(db,actor.id,{...input,template:parsed(input.template)});back=destination(input.collection)
  }else if(action==='/items/save'){
   allow(input,['collection','id','slug','title','values']);result=await saveCollectionItem(db,actor.id,{...input,values:parsed(input.values)});back=destination(input.collection,input.id)
  }else if(action==='/body'){
   allow(input,['collection','item','id','field','sections','media'])
   if(input.item!==undefined&&input.id!==undefined&&input.item!==input.id)throw Error('Choose one description item.')
   result=await saveCollectionBody(db,actor.id,{...input,sections:parsed(input.sections),...(input.media===undefined?{}:{media:parsed(input.media)})});back=destination(input.collection,input.item??input.id)
  }else if(action==='/items/schedule'){
   allow(input,['collection','id','start','end','timeZone','approve','cancel']);result=await saveItemSchedule(db,actor,input);back=destination(input.collection,input.id)
  }else if(action==='/starters'){
   allow(input,[]);result=await addStarterCollections(db,actor.id,input.base)
  }else{
   allow(input,['collection','id']);if(actor.role!=='owner')throw new PostDenied('Only the native owner can publish a collection item.')
   const selected={base:String(input.base??''),collection:String(input.collection??''),id:String(input.id??'')}
   result=env.PANE_LIVE?await liveCall(env,'/item-publish',{actor:{id:actor.id,role:actor.role},...selected}):await publishCollectionItem(db,actor.id,selected)
   back=destination(input.collection,input.id)
  }
  return api||request.headers.get('Accept')?.includes('application/json')?json(visibleRevision(result,caps,actor)):new Response(null,{status:303,headers:{location:back,'cache-control':'no-store'}})
 }catch(error){
  if(error instanceof PostDenied)return json({error:error.message},403)
  if(error instanceof DraftConflict)return json({error:error.message,latest:visibleRevision(error.latest,caps,actor)},409)
  return json({error:error instanceof Error?error.message:'Collection action failed.'},400)
 }
}
