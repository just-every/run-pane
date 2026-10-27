import type {TrashEntry,MenuFrame,MenuPlacement} from './lifecycle'
import {collectionId} from './collection-values'
const text=(value:unknown,max=240)=>typeof value==='string'&&!!value&&value.length<=max&&!/[\u0000-\u001f]/.test(value)
const iso=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value
const record=(value:unknown):Record<string,any>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid retained lifecycle metadata.');return value as Record<string,any>}
function frame(value:unknown):MenuFrame{
 const input=record(value),item=record(input.item)
 if(Object.keys(input).some(key=>!['item','anchors','index','before','after'].includes(key))||Object.keys(item).some(key=>!['label','page','url','cta'].includes(key))||!text(item.label,120)||item.page!==undefined&&!text(item.page)||item.url!==undefined&&!text(item.url,4000)||item.cta!==undefined&&typeof item.cta!=='boolean'||!Number.isInteger(input.index)||input.index<0||input.index>10000||!Array.isArray(input.anchors)||input.anchors.length>1000||input.anchors.some((key:unknown)=>!text(key,4500))||input.before!==undefined&&!text(input.before,4500)||input.after!==undefined&&!text(input.after,4500))throw Error('Invalid retained menu placement.')
 return structuredClone(input) as MenuFrame
}
function placement(value:unknown):MenuPlacement{
 const input=record(value)
 if(Object.keys(input).some(key=>!['menu','parents','frame'].includes(key))||!['main','footer'].includes(input.menu)||!Array.isArray(input.parents)||input.parents.length>8)throw Error('Invalid retained menu placement.')
 return {menu:input.menu,parents:input.parents.map(frame),frame:frame(input.frame)}
}
export function normalizeLifecycle(input:{trash?:unknown;postDeletions?:unknown}):{trash?:TrashEntry[];postDeletions?:string[]}{
 const result:{trash?:TrashEntry[];postDeletions?:string[]}={}
 if(input.trash!==undefined){
  if(!Array.isArray(input.trash)||input.trash.length>10000)throw Error('Invalid retained trash inventory.')
  if(input.trash.length)result.trash=input.trash.map(value=>{
   const entry=record(value)
   if(Object.keys(entry).some(key=>!['kind','id','collection','deletion','sourceRevision','actor','deletedAt','path','deletionTarget','placement','restoredAt','restoredBy'].includes(key))||!['page','post','item'].includes(entry.kind)||entry.kind==='item'&&!text(entry.collection,80)||entry.kind!=='item'&&entry.collection!==undefined||!text(entry.id)||!text(entry.deletion,500)||!text(entry.sourceRevision)||!text(entry.actor)||!iso(entry.deletedAt)||!text(entry.path,4000)||!entry.path.startsWith('/site')||!text(entry.deletionTarget,4000)||!entry.deletionTarget.startsWith('/site')||!Array.isArray(entry.placement)||entry.placement.length>1000||entry.restoredAt!==undefined&&!iso(entry.restoredAt)||entry.restoredBy!==undefined&&!text(entry.restoredBy))throw Error('Invalid retained deletion metadata.')
   if(entry.kind==='item')collectionId(entry.collection)
   return {...structuredClone(entry),placement:entry.placement.map(placement)} as TrashEntry
  })
 }
 if(input.postDeletions!==undefined){
  if(!Array.isArray(input.postDeletions)||input.postDeletions.length>1000||input.postDeletions.some(id=>!text(id)))throw Error('Invalid pending post deletions.')
  if(input.postDeletions.length)result.postDeletions=[...new Set(input.postDeletions)] as string[]
 }
 return result
}
