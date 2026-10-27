import {prepare,DraftConflict} from './content'
import {isProtected} from './access'
import {latestContent} from './posts'
import type {Page,Site} from './model'
export type LibraryFile={id:string;name:string;type:'application/pdf'|'audio/mpeg'|'audio/mp4';size:number;data:string}
const ascii=(bytes:Uint8Array,start:number,length:number)=>String.fromCharCode(...bytes.subarray(start,start+length))
function mp3Signature(bytes:Uint8Array):boolean {
 let start=0
 if(ascii(bytes,0,3)==='ID3'){
  if(bytes.length<10||bytes[3]<2||bytes[3]>4||[6,7,8,9].some(i=>bytes[i]>127))return false
  start=10+bytes[6]*2097152+bytes[7]*16384+bytes[8]*128+bytes[9]+(bytes[3]===4&&(bytes[5]&16)?10:0)
 }
 const frameSize=(offset:number)=>{
  if(offset+4>bytes.length||bytes[offset]!==255||(bytes[offset+1]&224)!==224)return 0
  const version=(bytes[offset+1]>>3)&3,layer=(bytes[offset+1]>>1)&3,rate=(bytes[offset+2]>>2)&3,index=bytes[offset+2]>>4
  if(version===1||layer!==1||rate===3||index===0||index===15)return 0
  const bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[index]*1000
  const sampleRate=[44100,48000,32000][rate]/(version===3?1:version===2?2:4)
  return Math.floor((version===3?144:72)*bitrate/sampleRate)+((bytes[offset+2]>>1)&1)
 }
 const first=frameSize(start),second=first?frameSize(start+first):0
 return first>0&&second>0&&start+first+second<=bytes.length
}
function m4aSignature(bytes:Uint8Array):boolean {
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
 type Box={kind:string;start:number;end:number}
 const boxes=(start:number,end:number):Box[]=>{
  const result:Box[]=[]
  while(start<end){
   if(start+8>end)return []
   let size=view.getUint32(start),header=8
   if(size===1){if(start+16>end||view.getUint32(start+8)!==0)return [];size=view.getUint32(start+12);header=16}
   else if(size===0)size=end-start
   if(size<header||start+size>end)return []
   result.push({kind:ascii(bytes,start+4,4),start:start+header,end:start+size});start+=size
  }
  return result
 }
 const top=boxes(0,bytes.length),ftyp=top.find(box=>box.kind==='ftyp'),moov=top.find(box=>box.kind==='moov')
 if(!ftyp||ftyp.start!==8||ftyp.end-ftyp.start<8||(ftyp.end-ftyp.start)%4!==0||!moov||!top.some(box=>box.kind==='mdat'&&box.end>box.start))return false
 const brands=[ascii(bytes,ftyp.start,4)]
 for(let i=ftyp.start+8;i<ftyp.end;i+=4)brands.push(ascii(bytes,i,4))
 if(!brands.some(brand=>['M4A ','isom','iso2','mp41','mp42'].includes(brand)))return false
 const tracks=boxes(moov.start,moov.end).filter(box=>box.kind==='trak')
 return tracks.length>0&&tracks.every(track=>{
  const mdia=boxes(track.start,track.end).find(box=>box.kind==='mdia')
  if(!mdia)return false
  const handler=boxes(mdia.start,mdia.end).find(box=>box.kind==='hdlr')
  return !!handler&&handler.end-handler.start>=12&&ascii(bytes,handler.start+8,4)==='soun'
 })
}
function hasSignature(bytes:Uint8Array,type:LibraryFile['type']):boolean {
 return type==='application/pdf'?ascii(bytes,0,5)==='%PDF-':type==='audio/mpeg'?mp3Signature(bytes):m4aSignature(bytes)
}
export function normalizeLibraryFiles(value:unknown):LibraryFile[]|undefined {
 if(value===undefined)return undefined
 if(!Array.isArray(value)||value.length>20)throw Error('Provide at most twenty library files.')
 const ids=new Set<string>();let total=0
 return value.map(input=>{
  if(!input||typeof input!=='object'||Object.keys(input).some(key=>!['id','name','type','size','data'].includes(key))||typeof input.id!=='string'||!/^[a-f0-9-]{36}$/.test(input.id)||ids.has(input.id)||typeof input.name!=='string'||!input.name.trim()||input.name.length>120||!['application/pdf','audio/mpeg','audio/mp4'].includes(input.type)||typeof input.data!=='string'||input.data.length>700000||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.data))throw Error('Choose a bounded PDF, MP3 or M4A library file.')
  let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(input.data),c=>c.charCodeAt(0))}catch{throw Error('Invalid library file encoding.')}
  total+=bytes.length
  if(bytes.length>512*1024||total>1024*1024||input.size!==bytes.length||!hasSignature(bytes,input.type))throw Error('Library files must have a matching PDF, MP3 or M4A signature and fit the library storage limit.')
  ids.add(input.id);return {id:input.id,name:input.name.normalize('NFC').trim(),type:input.type as LibraryFile['type'],size:bytes.length,data:input.data}
 })
}
export function postFiles(site:Site,page:Page):LibraryFile[]{
 const links:string[]=[]
 const walk=(nodes:import('./sections').RichNode[])=>{for(const node of nodes){if(node.tag==='a')links.push(node.href);if('children' in node)walk(node.children)}}
 for(const section of page.sections??[])for(const block of section.blocks){if(block.audio)links.push('file:'+block.audio.file);if(block.link)links.push(block.link.href);if(block.content)walk(block.content)}
 const ids=new Set(links.filter(href=>href.startsWith('file:')).map(href=>href.slice(5)))
 return (site.libraryFiles??[]).filter(file=>ids.has(file.id))
}
export async function uploadLibraryFile(db:D1Database,actor:string,base:string,file:File){
 const current=await latestContent(db)
 if(!current||current.id!==base)throw new DraftConflict(current)
 if(!['application/pdf','audio/mpeg','audio/mp4'].includes(file.type)||file.size>512*1024)throw Error('Choose a PDF, MP3 or M4A up to 512 KiB.')
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte)
 const item={id:crypto.randomUUID(),name:file.name,type:file.type,size:bytes.length,data:btoa(binary)}
 return prepare(db,actor,{...current.site,libraryFiles:normalizeLibraryFiles([...(current.site.libraryFiles??[]),item])},base)
}
export function publicLibraryFiles(site:Site):LibraryFile[]{
 const pages=[...site.pages.filter(page=>!page.deleted&&!page.hidden&&!isProtected(site,page)),...((site.access?.mode??'open')==='open'?(site.blogPosts??[]).map(post=>post.content):[])]
 const ids=new Set(pages.flatMap(page=>postFiles(site,page).map(file=>file.id)))
 return (site.libraryFiles??[]).filter(file=>ids.has(file.id))
}
export function libraryDownload(site:Site,id:string,head:boolean):Response {
 const file=publicLibraryFiles(site).find(file=>file.id===id)
 if(!file)return new Response(null,{status:404})
 const bytes=Uint8Array.from(atob(file.data),c=>c.charCodeAt(0))
 return new Response(head?null:bytes,{headers:{'content-type':file.type,'content-disposition':`${file.type==='application/pdf'?'attachment':'inline'}; filename="${file.name.replace(/[^a-zA-Z0-9._ -]/g,'_')}"`,'content-length':String(bytes.length),'x-content-type-options':'nosniff','content-security-policy':"sandbox; default-src 'none'",'cache-control':'private, no-store'}})
}
