import type {Site} from './model'
import {activePages,pageId,pagePath} from './pages'
/** References retain page identity; publication resolves the chosen revision's URL. */
export function pageReference(url:string):string|undefined{
 if(!url.startsWith('page:'))return undefined
 let id:string
 try{id=decodeURIComponent(url.slice(5))}catch{throw Error('Invalid page reference.')}
 if(!id||id.length>240||/[\u0000-\u001f]/.test(id))throw Error('Choose a page destination.')
 return id
}
export function referenceUrl(site:Site,url:string):string|null{
 const id=pageReference(url)
 if(id===undefined)return url
 const page=activePages(site).find(page=>pageId(page)===id)
 return page?pagePath(site,page.slug):null
}
