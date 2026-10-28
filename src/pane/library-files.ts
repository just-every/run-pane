import {collectionPages} from './collection-page'
import {prepare,DraftConflict} from './content'
import {isProtected} from './access'
import {latestContent} from './posts'
import type {Page,Site} from './model'
import {mediaMetadata,type MediaMetadata} from './media-metadata'
export type LibraryFile=MediaMetadata&{id:string;name:string;type:'application/pdf'|'audio/mpeg'|'audio/mp4';size:number;data:string}
function validLibraryBytes(type:string,bytes:Uint8Array):boolean {
 const text=new TextDecoder().decode(bytes.slice(0,48))
 if(type==='application/pdf')return text.startsWith('%PDF-')
 if(type==='audio/mpeg')return bytes.length>10&&(text.startsWith('ID3')||(bytes[0]===255&&(bytes[1]&0xe0)===0xe0))
 return bytes.length>16&&text.slice(4,8)==='ftyp'&&/M4A |isom|mp42/.test(text.slice(8))
}
export function normalizeLibraryFiles(value:unknown):LibraryFile[]|undefined {
 if(value===undefined)return undefined
 if(!Array.isArray(value)||value.length>20)throw Error('Provide at most twenty library files.')
 const ids=new Set<string>();let total=0
 return value.map(input=>{
  if(!input||typeof input!=='object'||Object.keys(input).some(key=>!['id','name','type','size','data','folder','caption'].includes(key))||typeof input.id!=='string'||!/^[a-f0-9-]{36}$/.test(input.id)||ids.has(input.id)||typeof input.name!=='string'||!input.name.trim()||input.name.length>120||!['application/pdf','audio/mpeg','audio/mp4'].includes(input.type)||typeof input.data!=='string'||input.data.length>700000||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.data))throw Error('Choose a bounded PDF, MP3 or M4A library file.')
  let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(input.data),c=>c.charCodeAt(0))}catch{throw Error('Invalid PDF encoding.')}
  total+=bytes.length
  if(bytes.length>512*1024||total>1024*1024||input.size!==bytes.length||!validLibraryBytes(input.type,bytes))throw Error('Library files must match their declared format and fit the storage limit.')
  let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte)
  if(btoa(binary)!==input.data)throw Error('Use canonical file encoding.')
  ids.add(input.id);return {id:input.id,name:input.name.normalize('NFC').trim(),...mediaMetadata(input),type:input.type as LibraryFile['type'],size:bytes.length,data:input.data}
 })
}
export function postFiles(site:Site,page:Page):LibraryFile[]{
 const links:string[]=[]
 const walk=(nodes:import('./sections').RichNode[])=>{for(const node of nodes){if(node.tag==='a')links.push(node.href);if('children' in node)walk(node.children)}}
 for(const section of page.sections??[])for(const block of section.blocks){if(block.audio?.file)links.push('file:'+block.audio.file);if(block.link)links.push(block.link.href);if(block.content)walk(block.content)}
 const ids=new Set(links.filter(href=>href.startsWith('file:')).map(href=>href.slice(5)))
 return (site.libraryFiles??[]).filter(file=>ids.has(file.id))
}
export async function uploadLibraryFile(db:D1Database,actor:string,base:string,file:File){
 const current=await latestContent(db)
 if(!current||current.id!==base)throw new DraftConflict(current)
 if(!['application/pdf','audio/mpeg','audio/mp4','audio/x-m4a'].includes(file.type)||file.size>512*1024)throw Error('Choose a PDF, MP3 or M4A up to 512 KiB.')
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte)
 const item={id:crypto.randomUUID(),name:file.name,type:file.type==='audio/x-m4a'?'audio/mp4':file.type,size:bytes.length,data:btoa(binary)}
 return prepare(db,actor,{...current.site,libraryFiles:normalizeLibraryFiles([...(current.site.libraryFiles??[]),item])},base)
}
export function publicLibraryFiles(site:Site):LibraryFile[]{
 const pages=[...site.pages.filter(page=>!page.deleted&&!page.hidden&&!isProtected(site,page)),...((site.access?.mode??'open')==='open'?[...(site.blogPosts??[]).map(post=>post.content),...collectionPages(site)]:[])]
 const ids=new Set(pages.flatMap(page=>postFiles(site,page).map(file=>file.id)))
 return (site.libraryFiles??[]).filter(file=>ids.has(file.id))
}
export function libraryDownload(site:Site,id:string,head:boolean):Response {
 const file=publicLibraryFiles(site).find(file=>file.id===id)
 if(!file)return new Response(null,{status:404})
 const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0))
 return new Response(head?null:bytes,{headers:{'content-type':file.type,'content-disposition':`${file.type==='application/pdf'?'attachment':'inline'}; filename="${file.name.replace(/[^a-zA-Z0-9._ -]/g,'_')}"`,'content-length':String(bytes.length),'x-content-type-options':'nosniff','content-security-policy':"sandbox; default-src 'none'",'cache-control':'private, no-store'}})
}
