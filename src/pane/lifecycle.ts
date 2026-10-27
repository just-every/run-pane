import {pageId,pagePath} from './pages'
import {lifecycleItemPath,restoreItemVersion} from './lifecycle-items'
import {blogPostPath} from './post-links'
import type {MenuItem,Navigation} from './navigation'
import type {LifecycleContext,LifecycleDeletionContext,LifecycleEvent,LifecyclePost,LifecycleSite,LifecycleTarget,LifecycleTransition,MenuFrame,MenuPlacement,TrashEntry} from './lifecycle-types'
export type {LifecycleContext,LifecycleDeletionContext,LifecycleEvent,LifecyclePost,LifecycleSite,LifecycleTarget,LifecycleTransition,MenuFrame,MenuPlacement,TrashEntry} from './lifecycle-types'

const retention=30*24*60*60*1000
function clock(at:string):number{
 const value=Date.parse(at)
 if(!Number.isFinite(value)||new Date(value).toISOString()!==at)throw Error('Use the server clock as a canonical ISO timestamp.')
 return value
}
function context(value:LifecycleContext):LifecycleContext{
 clock(value.at)
 if(typeof value.actor!=='string'||!value.actor.trim()||value.actor.length>240)throw Error('Record the authenticated actor.')
 return {actor:value.actor,at:value.at}
}
const key=(item:MenuItem)=>item.page?'page:'+item.page:item.url?'url:'+item.url:'group:'+item.label
const shell=({children,...item}:MenuItem)=>item
function frame(items:MenuItem[],index:number):MenuFrame{
 return {item:shell(items[index]),anchors:(items[index].children??[]).map(key),index,...(index?{before:key(items[index-1])}:{}),...(index+1<items.length?{after:key(items[index+1])}:{})}
}
const targets=(item:MenuItem,slug:string,path:string)=>item.page===slug||item.url===path
function placements(navigation:Navigation|undefined,slug:string,path:string):MenuPlacement[]{
 const result:MenuPlacement[]=[]
 if(!navigation)return result
 for(const menu of ['main','footer'] as const){
  function walk(items:MenuItem[],parents:MenuFrame[]){
   items.forEach((item,index)=>{
    const current=frame(items,index)
    if(targets(item,slug,path))result.push({menu,parents:structuredClone(parents),frame:current})
    if(item.children)walk(item.children,[...parents,current])
   })
  }
  walk(navigation[menu],[])
 }
 return result
}
function removeLinks(items:MenuItem[],slug:string,path:string):MenuItem[]{
 return items.flatMap(item=>{
  const children=item.children?removeLinks(item.children,slug,path):undefined
  if(targets(item,slug,path))return children?.length?[{label:item.label,children}]:[]
  return [{...item,...(children?{children}:{})}]
 })
}
function insert(items:MenuItem[],item:MenuItem,where:MenuFrame){
 const next=where.after?items.findIndex(candidate=>key(candidate)===where.after):-1
 const previous=where.before?items.findIndex(candidate=>key(candidate)===where.before):-1
 items.splice(next>=0?next:previous>=0?previous+1:Math.min(where.index,items.length),0,item)
}
function findParent(items:MenuItem[],where:MenuFrame):MenuItem|undefined{
 let matches=items.filter(item=>key(item)===key(where.item))
 if(!matches.length&&where.anchors.length)matches=items.filter(item=>item.children?.some(child=>where.anchors.includes(key(child))))
 if(matches.length>1)throw Error('The original menu location is ambiguous; review the menu before restoring.')
 return matches[0]
}
/** Merge just the missing target and necessary ancestor shells into today's menus. */
export function restoreLinks(site:LifecycleSite,saved:MenuPlacement[]){
 if(!site.navigation)return // Implicit navigation follows the restored page order.
 for(const placement of saved){
  let items=site.navigation[placement.menu]
  for(const ancestor of placement.parents){
   let parent=findParent(items,ancestor)
   if(!parent){
    const destination=ancestor.item.page
    parent=destination&&!site.pages.some(page=>!page.deleted&&page.slug===destination)?{label:ancestor.item.label,children:[]}:{...ancestor.item,children:[]}
    insert(items,parent,ancestor)
   }
   parent.children??=[];items=parent.children
  }
  if(items.some(item=>key(item)===key(placement.frame.item)))continue
  const group=items.find(item=>!item.page&&!item.url&&item.label===placement.frame.item.label)
  if(group)Object.assign(group,placement.frame.item)
  else insert(items,{...placement.frame.item},placement.frame)
 }
}
function deletionTarget(site:LifecycleSite,path:string,otherwise:string):string{
 return site.redirectOffers?.find(offer=>offer.from===path&&offer.reason==='deleted')?.to??site.redirects?.find(redirect=>redirect.from===path)?.to??otherwise
}
function removeDeletionRedirect(site:LifecycleSite,path:string,to?:string){
 const matching=(site.redirectOffers??[]).filter(offer=>offer.from===path&&offer.reason==='deleted'&&(to===undefined||offer.to===to))
 const destinations=new Set([...matching.map(offer=>offer.to),...(to?[to]:[])])
 if(site.redirects)site.redirects=site.redirects.filter(redirect=>redirect.from!==path||!destinations.has(redirect.to))
 if(site.redirectOffers)site.redirectOffers=site.redirectOffers.filter(offer=>!matching.includes(offer))
 if(site.redirects?.some(redirect=>redirect.from===path)||site.redirectOffers?.some(offer=>offer.from===path))throw Error('A newer redirect uses the original URL; review it before restoring.')
}
function assertRoute(site:LifecycleSite,target:LifecycleTarget,path:string){
 const page=site.pages.find(page=>target.kind==='page'&&pageId(page)===target.id)
 if(page&&pagePath(site,page.slug)!==path)throw Error('The original URL now has another home-page assignment; review it before restoring.')
 for(const candidate of site.pages)if(!candidate.deleted&&!(target.kind==='page'&&pageId(candidate)===target.id)&&pagePath(site,candidate.slug)===path)throw Error('Another page uses the original URL; resolve that collision before restoring.')
 for(const post of site.posts??[])if(!post.deleted&&!(target.kind==='post'&&post.id===target.id)&&blogPostPath(site,post)===path)throw Error('Another post uses the original URL; resolve that collision before restoring.')
 for(const post of site.blogPosts??[])if(!(target.kind==='post'&&post.id===target.id)&&blogPostPath(site,post)===path)throw Error('An approved post uses the original URL; resolve that collision before restoring.')
 for(const blog of site.blogs??[])if('/site/'+blog.prefix===path)throw Error('A blog index uses the original URL; resolve that collision before restoring.')
 for(const collection of site.collections??[]){
  if('/site/'+collection.prefix===path)throw Error('A collection index uses the original URL; resolve that collision before restoring.')
  for(const item of collection.items)if(!(target.kind==='item'&&target.collection===collection.id&&target.id===item.id)&&lifecycleItemPath(collection,item)===path)throw Error('Another collection item uses the original URL; resolve that collision before restoring.')
 }
 if(['/site/search','/site/visit'].includes(path)||path.startsWith('/site/files/'))throw Error('A service uses the original URL; resolve that collision before restoring.')
}
const privateDraft=(post:LifecyclePost):LifecyclePost=>{
 const {review,deleted,...draft}=structuredClone(post)
 return {...draft,state:'draft',content:{...draft.content,hidden:true}}
}

/** Call before normalization drops removed menu links or deleted post fields. */
export function recordDeletions(before:LifecycleSite,after:LifecycleSite,supplied:LifecycleDeletionContext):LifecycleTransition{
 const ctx=context(supplied),site=structuredClone(after),events:LifecycleEvent[]=[]
 if(typeof supplied.sourceRevision!=='string'||!supplied.sourceRevision.trim()||supplied.sourceRevision.length>240)throw Error('Record the immutable source revision before deleting content.')
 // Lifecycle metadata is server-owned, not an editable part of an incoming site.
 site.trash=structuredClone(before.trash??[])
 site.postDeletions=[...(before.postDeletions??[])]
 const deletedPages=before.pages.filter(page=>!page.deleted&&!after.pages.some(next=>pageId(next)===pageId(page)&&!next.deleted))
 const deletedPosts=(before.posts??[]).filter(post=>!post.deleted&&!(after.posts??[]).some(next=>next.id===post.id&&!next.deleted))
 for(const page of deletedPages){
  const id=pageId(page),path=pagePath(before,page.slug),deletion='page:'+id+':'+ctx.at
  site.trash.push({kind:'page',id,deletion,sourceRevision:supplied.sourceRevision,actor:ctx.actor,deletedAt:ctx.at,path,deletionTarget:deletionTarget(after,path,'/site'),placement:placements(before.navigation,page.slug,path)})
  if(!site.pages.some(next=>pageId(next)===id)){
   const original=before.pages.findIndex(candidate=>pageId(candidate)===id),next=before.pages.slice(original+1).find(candidate=>site.pages.some(saved=>pageId(saved)===pageId(candidate)))
   const position=next?site.pages.findIndex(candidate=>pageId(candidate)===pageId(next)):site.pages.length
   site.pages.splice(position,0,{...structuredClone(page),deleted:true})
  }
  events.push({kind:'page',id,...ctx,action:'content.delete',sourceDeletion:deletion,sourceRevision:supplied.sourceRevision})
 }
 if(!site.pages.some(page=>!page.deleted))throw Error('Keep at least one active page.')
 for(const post of deletedPosts){
  const path=blogPostPath(before,post),deletion='post:'+post.id+':'+ctx.at
  site.trash.push({kind:'post',id:post.id,deletion,sourceRevision:supplied.sourceRevision,actor:ctx.actor,deletedAt:ctx.at,path,deletionTarget:deletionTarget(after,path,'/site/'+(before.blogs?.find(blog=>blog.id===post.blog)?.prefix??post.blog)),placement:placements(before.navigation,'\u0000',path)})
  site.posts??=[]
  const index=site.posts.findIndex(next=>next.id===post.id)
  const tombstone={...privateDraft(post),deleted:true}
  if(index<0)site.posts.push(tombstone);else site.posts[index]=tombstone
  if(!site.postDeletions.includes(post.id))site.postDeletions.push(post.id)
  events.push({kind:'post',id:post.id,...ctx,action:'content.delete',sourceDeletion:deletion,sourceRevision:supplied.sourceRevision})
 }
 for(const collection of before.collections??[])for(const item of collection.items){
  if(after.collections?.find(candidate=>candidate.id===collection.id)?.items.some(candidate=>candidate.id===item.id))continue
  const path=lifecycleItemPath(collection,item),deletion='item:'+collection.id+':'+item.id+':'+ctx.at
  const to=deletionTarget(after,path,'/site/'+collection.prefix)
  site.trash.push({kind:'item',id:item.id,collection:collection.id,deletion,sourceRevision:supplied.sourceRevision,actor:ctx.actor,deletedAt:ctx.at,path,deletionTarget:to,placement:placements(before.navigation,'\u0000',path)})
  if(!site.redirects?.some(redirect=>redirect.from===path)&&!site.redirectOffers?.some(offer=>offer.from===path)){site.redirectOffers??=[];site.redirectOffers.push({from:path,to,reason:'deleted'})}
  events.push({kind:'item',id:item.id,collection:collection.id,...ctx,action:'content.delete',sourceDeletion:deletion,sourceRevision:supplied.sourceRevision})
 }
 if(site.navigation)for(const entry of site.trash.slice((before.trash??[]).length))for(const menu of ['main','footer'] as const)site.navigation[menu]=removeLinks(site.navigation[menu],entry.kind==='page'?before.pages.find(page=>pageId(page)===entry.id)!.slug:'\u0000',entry.path)
 return {site,events}
}

/** Expiration hides availability; it never mutates the retained revision history. */
export function trashItems(site:LifecycleSite,at:string):TrashEntry[]{
 const now=clock(at)
 return structuredClone((site.trash??[]).filter(entry=>{
  const age=now-clock(entry.deletedAt)
  const deleted=entry.kind==='page'?!site.pages.some(page=>pageId(page)===entry.id&&!page.deleted):entry.kind==='post'?!(site.posts??[]).some(post=>post.id===entry.id&&!post.deleted):!site.collections?.find(collection=>collection.id===entry.collection)?.items.some(item=>item.id===entry.id)
  return !entry.restoredAt&&deleted&&age>=0&&age<=retention
 }))
}

export function restoreTrash(latest:LifecycleSite,source:LifecycleSite,target:LifecycleTarget,supplied:LifecycleContext):LifecycleTransition{
 const ctx=context(supplied),entry=trashItems(latest,ctx.at).filter(entry=>entry.kind===target.kind&&entry.id===target.id&&(target.kind!=='item'||entry.kind==='item'&&entry.collection===target.collection)).at(-1)
 if(!entry)throw Error('This item is no longer available in the trash.')
 const site=structuredClone(latest)
 let requiresCodeApproval=false
 if(entry.kind==='page'){
  const original=source.pages.find(page=>pageId(page)===entry.id&&!page.deleted)
  if(!original||pagePath(source,original.slug)!==entry.path)throw Error('The retained deletion source does not contain this page at its original URL.')
  const page={...structuredClone(original),deleted:false},index=site.pages.findIndex(candidate=>pageId(candidate)===entry.id)
  requiresCodeApproval=!!page.customCode
  if(index<0)site.pages.push(page);else site.pages[index]=page
 }else if(entry.kind==='item'){
  const path=restoreItemVersion(site,source,entry)
  if(path!==entry.path)throw Error('The retained item does not have its original URL.')
 }else{
  const original=source.posts?.find(post=>post.id===entry.id&&!post.deleted)
  if(!original||blogPostPath(source,original)!==entry.path)throw Error('The retained deletion source does not contain this post at its original URL.')
  const post=privateDraft(original),index=(site.posts??[]).findIndex(candidate=>candidate.id===entry.id)
  if(blogPostPath(site,post)!==entry.path)throw Error('The original blog URL has changed; review it before restoring.')
  const current=site.posts?.[index]
  if(current&&current.author!==post.author)throw Error('Trash restore cannot change the original post author.')
  if(current?.authorSlug)post.authorSlug=current.authorSlug
  site.posts??=[];if(index<0)site.posts.push(post);else site.posts[index]=post
  site.postDeletions=site.postDeletions?.filter(id=>id!==entry.id)
 }
 assertRoute(site,target,entry.path)
 restoreLinks(site,entry.placement);removeDeletionRedirect(site,entry.path,entry.deletionTarget)
 const saved=site.trash!.find(candidate=>candidate.deletion===entry.deletion)!
 saved.restoredAt=ctx.at;saved.restoredBy=ctx.actor
 return {site,events:[{...target,...ctx,action:'content.restore',sourceDeletion:entry.deletion,sourceRevision:entry.sourceRevision,...(requiresCodeApproval?{requiresCodeApproval:true}:{})}]}
}

/** A selected immutable source contributes only this target to the latest draft. */
export function restoreHistorical(latest:LifecycleSite,source:LifecycleSite,target:LifecycleTarget&{revision:string},supplied:LifecycleContext):LifecycleTransition{
 const ctx=context(supplied),site=structuredClone(latest)
 if(typeof target.revision!=='string'||!target.revision)throw Error('Choose a retained source revision.')
 let requiresCodeApproval=false
 if(target.kind==='page'){
  const historical=source.pages.find(page=>pageId(page)===target.id&&!page.deleted),index=site.pages.findIndex(page=>pageId(page)===target.id)
  if(!historical||index<0)throw Error('Choose an active page and one of its retained versions.')
  const previous=site.pages[index],page={...structuredClone(historical),deleted:false}
  site.pages[index]=page;assertRoute(site,target,pagePath(site,page.slug))
  const retarget=(items:MenuItem[]):MenuItem[]=>items.map(item=>({...item,...(item.page===previous.slug?{page:page.slug}:{}),...(item.children?{children:retarget(item.children)}:{})}))
  if(site.navigation)for(const menu of ['main','footer'] as const)site.navigation[menu]=retarget(site.navigation[menu])
  removeDeletionRedirect(site,pagePath(site,page.slug));requiresCodeApproval=!!page.customCode
 }else if(target.kind==='item'){
  const path=restoreItemVersion(site,source,target)
  const deletion=site.trash?.filter(entry=>entry.kind==='item'&&entry.collection===target.collection&&entry.id===target.id&&entry.path===path).at(-1)
  assertRoute(site,target,path);removeDeletionRedirect(site,path,deletion?.deletionTarget)
  if(deletion){deletion.restoredAt=ctx.at;deletion.restoredBy=ctx.actor}
 }else{
  const historical=source.posts?.find(post=>post.id===target.id&&!post.deleted),index=(site.posts??[]).findIndex(post=>post.id===target.id)
  if(!historical||index<0)throw Error('Choose an active private post and one of its retained versions.')
  if(site.posts![index].author!==historical.author)throw Error('Historical restore cannot change the original post author.')
  const restored=privateDraft(historical),current=site.posts![index]
  if(current.authorSlug)restored.authorSlug=current.authorSlug
  site.posts![index]=restored
  site.postDeletions=site.postDeletions?.filter(id=>id!==target.id)
  assertRoute(site,target,blogPostPath(site,historical));removeDeletionRedirect(site,blogPostPath(site,historical))
 }
 const identity:LifecycleTarget=target.kind==='item'?{kind:'item',id:target.id,collection:target.collection}:{kind:target.kind,id:target.id}
 return {site,events:[{...identity,...ctx,action:'content.restore-version',sourceRevision:target.revision,...(requiresCodeApproval?{requiresCodeApproval:true}:{})}]}
}
