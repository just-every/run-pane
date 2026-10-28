/** Font bytes belong to the immutable site revision, including portable archives. */
export type SiteFont = {id:string;name:string;format:'woff2'|'woff'|'ttf'|'otf';data:string}
export const builtInFonts = {figtree:{name:'Figtree',css:'Figtree, sans-serif'},georgia:{name:'Georgia',css:'Georgia, serif'},arial:{name:'Arial',css:'Arial, sans-serif'},verdana:{name:'Verdana',css:'Verdana, sans-serif'},trebuchet:{name:'Trebuchet MS',css:'"Trebuchet MS", sans-serif'},times:{name:'Times New Roman',css:'"Times New Roman", serif'},mono:{name:'Monospace',css:'monospace'}}
export function normalizeFonts(value:unknown):SiteFont[]{
 if(value===undefined)return []
 if(!Array.isArray(value)||value.length>4)throw Error('Keep up to four uploaded fonts in this revision.')
 const ids=new Set<string>();let total=0
 return value.map(raw=>{
  if(!raw||typeof raw!=='object'||Object.keys(raw).some(key=>!['id','name','format','data'].includes(key)))throw Error('Invalid uploaded font.')
  const {id,name,format,data}=raw
  if(typeof id!=='string'||!/^font-[a-f0-9-]{36}$/.test(id)||ids.has(id))throw Error('Uploaded fonts need unique identities.')
  ids.add(id)
  if(typeof name!=='string'||!name.trim()||name.length>80||/[\x00-\x1f]/.test(name))throw Error('Name the uploaded font in 80 characters or fewer.')
  if(!['woff2','woff','ttf','otf'].includes(format)||typeof data!=='string'||data.length>524288||!data.length||data.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw Error('Choose a WOFF2, WOFF, TTF or OTF font up to 384 KiB.')
  const binary=atob(data),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),signature=binary.slice(0,4)
  total+=bytes.length
  if(total>786432||btoa(binary)!==data)throw Error('Uploaded fonts exceed the 768 KiB revision budget.')
  const web=format==='woff2'||format==='woff'
  if(web){
   if(bytes.length<(format==='woff2'?48:44)||signature!==(format==='woff2'?'wOF2':'wOFF')||view.getUint32(8)!==bytes.length||!view.getUint16(12)||view.getUint16(14)!==0||view.getUint32(16)>16777216)throw Error('The font container is invalid or too large when decoded.')
   if(format==='woff'&&44+view.getUint16(12)*20>bytes.length)throw Error('The WOFF table directory is incomplete.')
  }else{
   if(bytes.length<12||signature!==(format==='otf'?'OTTO':'\x00\x01\x00\x00'))throw Error('The font signature does not match its format.')
   const count=view.getUint16(4)
   if(!count||count>256||12+count*16>bytes.length)throw Error('The font table directory is incomplete.')
   for(let i=0;i<count;i++){const offset=view.getUint32(12+i*16+8),length=view.getUint32(12+i*16+12);if(offset+length>bytes.length)throw Error('A font table is outside the uploaded file.')}
  }
  return {id,name:name.normalize('NFC').trim(),format,data} as SiteFont
 })
}
export function fontResponse(fonts:SiteFont[]|undefined,id:string|null,method:string):Response{
 const font=fonts?.find(font=>font.id===id)
 const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','vary':'Cookie'}
 if(!font||!['GET','HEAD'].includes(method))return new Response(null,{status:404,headers})
 const bytes=Uint8Array.from(atob(font.data),c=>c.charCodeAt(0))
 return new Response(method==='HEAD'?null:bytes,{headers:{...headers,'content-type':'font/'+font.format,'content-length':String(bytes.length)}})
}
