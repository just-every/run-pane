import type {Page,Site} from './model'
import {collectionItemPage,collectionItemPath} from './collection-page'
export {collectionItemPage,collectionPages} from './collection-page'
import {pagePath} from './pages'
import {preparedImageResponse} from './image-response'
import {pageEmbedOrigins} from './embeds'
import {publicPage} from './public-view'
import {document} from './views'

function imageResponse(site:Site,page:Page,url:URL,head:boolean):Response{
 const selected=(url.searchParams.get('pane-image')??'').split(':')
 if(selected.length>2||!selected[0]||selected.length===2&&!selected[1])return preparedImageResponse(undefined,null,head)
 const [id,asset]=selected,block=page.sections?.flatMap(section=>section.blocks).find(block=>block.id===id)
 const image=asset
  ?block?.kind==='gallery'&&block.gallery?.items.some(item=>item.asset===asset)?site.media?.find(item=>item.id===asset)?.image:undefined
  :block?.kind==='image'?block.image:undefined
 return preparedImageResponse(image,url.searchParams.get('width'),head)
}

/** The caller supplies only the approved, access-filtered site snapshot. */
export async function collectionResponse(request:Request,site:Site):Promise<Response|null>{
 if(!['GET','HEAD'].includes(request.method))return null
 const url=new URL(request.url),head=request.method==='HEAD'
 let path:string
 try{path=decodeURIComponent(url.pathname)}catch{return null}
 const collection=site.collections?.find(candidate=>path==='/site/'+candidate.prefix||path.startsWith('/site/'+candidate.prefix+'/'))
 if(!collection)return null
 const item=collection.items.find(candidate=>collectionItemPath(collection,candidate)===path)
 if(!item&&path!=='/site/'+collection.prefix)return null
 if(!item&&site.pages.some(page=>!page.deleted&&pagePath(site,page.slug)===path))return null
 const page:Page=item?collectionItemPage(site,collection,item):{
  id:'collection-'+collection.id,slug:collection.prefix,title:collection.title,hidden:true,
  body:collection.items.length?'Choose an item to read its details.':'No published items yet.',
  links:collection.items.map(item=>({label:item.title,url:collectionItemPath(collection,item)})),
 }
 if(url.searchParams.has('pane-image'))return imageResponse(site,page,url,head)
 const publicSite={...site,pages:[...site.pages.filter(candidate=>candidate.slug!==page.slug),page]}
 const gpc=request.headers.get('Sec-GPC')==='1',quiet=gpc||request.headers.get('DNT')==='1'
 const markup=publicPage(publicSite,page.slug,'live',gpc,quiet)
 const response=await document(page.title+' · '+site.name,markup,'site',pageEmbedOrigins(page),undefined,site.locale?.locale)
 const headers=new Headers(response.headers)
 headers.set('cache-control','private, no-store');headers.set('vary','Cookie')
 return new Response(head?null:response.body,{status:response.status,headers})
}
