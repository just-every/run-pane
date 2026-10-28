import {prepare,DraftConflict,normalizeSite,revision} from './content'
import {normalizeMedia} from './gallery'
import {normalizeLibraryFiles} from './library-files'
import {mediaMetadata} from './media-metadata'
import {mediaUses,distinctUses,MediaInUse,type MediaKind} from './media-usage'
import {latestContent} from './posts'
import {normalizeSections,sectionText} from './sections'
import type {Site} from './model'

function assetKind(value:unknown):MediaKind {
 if(value!=='image'&&value!=='pdf')throw Error('Choose an image or PDF.')
 return value
}

export function libraryAssets(site:Site,query:URLSearchParams,live?:Site){
 const q=(query.get('q')??'').normalize('NFC').toLocaleLowerCase(),kind=query.get('type'),folder=query.get('folder')
 return [...(site.media??[]).map(item=>({...item,kind:'image' as const})),...(site.libraryFiles??[]).filter(item=>item.type==='application/pdf').map(item=>({...item,kind:'pdf' as const}))].filter(item=>(!kind||kind===item.kind)&&(!folder||(folder==='__unfiled'?!item.folder:folder===item.folder))&&(!q||[item.name,item.folder,item.caption,'image' in item?item.image.alt:''].some(value=>value?.toLocaleLowerCase().includes(q)))).map(item=>({...item,uses:distinctUses([...mediaUses(site,item.kind,item.id),...(live?mediaUses(live,item.kind,item.id):[])])}))
}

/** Owner-only callers prepare a revision; approval and public delivery stay separate. */
export async function changeLibrary(db:D1Database,actor:string,input:Record<string,unknown>){
 const current=await latestContent(db)
 if(!current)throw Error('Prepare the site before adding media.')
 if(typeof input.base!=='string'||input.base!==current.id)throw new DraftConflict(current)
 let site=structuredClone(current.site)
 if(input.action==='upload'){
  if(!Array.isArray(input.images??[])||!Array.isArray(input.files??[])||!(input.images as unknown[]??[]).length&&!(input.files as unknown[]??[]).length)throw Error('Choose at least one image or PDF.')
  site.media=normalizeMedia([...(site.media??[]),...(input.images as unknown[]??[])])
  site.libraryFiles=normalizeLibraryFiles([...(site.libraryFiles??[]),...(input.files as unknown[]??[])])
 }else if(input.action==='restore'){
  // Undo selects retained content through the same native owner's draft door.
  // It never edits a source revision, publishes, or changes current access rules.
  const selected=normalizeSite(input.site)
  for(const key of Object.keys(site) as (keyof Site)[])if(!['media','libraryFiles','pages'].includes(key)&&JSON.stringify(selected[key])!==JSON.stringify(site[key]))throw Error('Reload the library before undoing changes to other settings.')
  if(JSON.stringify(selected.pages.map(({sections,body,...page})=>page))!==JSON.stringify(site.pages.map(({sections,body,...page})=>page)))throw Error('Reload the library before undoing changes to page settings.')
  site={...site,media:selected.media,libraryFiles:selected.libraryFiles,pages:selected.pages}
 }else{
  const kind=assetKind(input.kind),id=String(input.id??'')
  const asset=kind==='image'?site.media?.find(item=>item.id===id):site.libraryFiles?.find(item=>item.id===id)
  if(!asset)throw Error('Library file not found.')
  if(input.action==='delete'){
   if(kind==='image')site.media=site.media!.filter(item=>item.id!==id)
   else site.libraryFiles=site.libraryFiles!.filter(item=>item.id!==id)
  }else if(input.action==='update'){
   if(typeof input.name!=='string'||!input.name.trim())throw Error('Give the file a name.')
   const metadata=mediaMetadata(input)
   delete asset.folder;delete asset.caption
   Object.assign(asset,metadata,{name:input.name})
   if(kind==='image'&&'image' in asset)asset.image={...asset.image,alt:input.alt as string,decorative:input.decorative as boolean}
  }else if(input.action==='place'){
   const page=site.pages.find(page=>!page.deleted&&(page.id??page.slug)===input.page)
   if(!page)throw Error('Choose an existing page.')
   if(page.importedHtml!==undefined||page.layout!==undefined)throw Error('Open this page in the visual canvas before placing a library file.')
   const sections=page.sections??normalizeSections([{id:crypto.randomUUID(),kind:'text',blocks:[{id:crypto.randomUUID(),kind:'text',text:page.body,column:1,span:12,row:1}]}])!
   const block=kind==='image'?{id:crypto.randomUUID(),kind:'gallery',text:'',column:1,span:12,row:1,gallery:{layout:'grid',columns:1,phoneColumns:1,gap:16,phoneGap:12,lightbox:false,items:[{asset:id,caption:asset.caption??''}]}}:{id:crypto.randomUUID(),kind:'button',text:asset.caption??asset.name,column:1,span:12,row:1,link:{href:'file:'+id,newTab:false}}
   page.sections=normalizeSections([...sections,{id:crypto.randomUUID(),kind:'text',blocks:[block]}])
   page.body=sectionText(page.sections!)
  }else throw Error('Choose a library action.')
 }
 // Undo must obey the same deletion guard as the explicit Delete action.
 const removed=[...(current.site.media??[]).filter(asset=>!site.media?.some(item=>item.id===asset.id)).map(asset=>({kind:'image' as const,id:asset.id})),...(current.site.libraryFiles??[]).filter(asset=>!site.libraryFiles?.some(item=>item.id===asset.id)).map(asset=>({kind:'pdf' as const,id:asset.id}))]
 if(removed.length){
  const liveRow=await db.prepare('SELECT r.* FROM pane_revisions r JOIN pane_state s ON s.live=r.id WHERE s.id=1').first(),live=liveRow?revision(liveRow).site:undefined
  const uses=distinctUses(removed.flatMap(asset=>[...mediaUses(current.site,asset.kind,asset.id),...(live?mediaUses(live,asset.kind,asset.id):[])]))
  if(uses.length)throw new MediaInUse(uses)
 }
 return prepare(db,actor,site,current.id)
}
