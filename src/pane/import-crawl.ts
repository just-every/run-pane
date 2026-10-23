import { isIP } from 'node:net'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { parse } from 'parse5'
import { sha256 } from '../modules/import-kit/src/provenance/identity.ts'
import type { Bindings } from '../auth.server'

const providers=['wix','webflow','framer','durable'] as const
const encoder=new TextEncoder()
const maxSource=512000, maxRequests=120, maxUrls=100, maxDocument=100000
const array=(value:any):any[]=>value===undefined?[]:Array.isArray(value)?value:[value]
type Challenge={origin:string;provider:typeof providers[number];actor:string;version:number;expires:number;nonce:string}
const base64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')
const unbase64=(value:string)=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))
const hmac=(secret:string)=>crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])

function sourceOrigin(value:unknown,installation:string):string {
 if(typeof value!=='string')throw Error('Choose the published HTTPS source origin.')
 const url=new URL(value),host=url.hostname
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||isIP(host)||!host.includes('.')||/(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(host)||host.endsWith('.')||host===new URL(installation).hostname)throw Error('The crawl needs a different public HTTPS hostname, without credentials, a port or a path.')
 return url.origin
}
/** Addresses are screened again before each source request; redirects are never followed. */
function publicAddress(value:string):boolean {
 if(isIP(value)===4){
  const [a,b,c]=value.split('.').map(Number)
  return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113)
 }
 if(isIP(value)!==6||!/^([23][0-9a-f]{3}):/i.test(value))return false
 const [first,second='0']=value.toLowerCase().split(':')
 return !(first==='2001'&&(parseInt(second||'0',16)<0x200||second==='db8')||first==='2002'||first==='3fff')
}
async function limitedText(response:Response,limit:number):Promise<string>{
 const size=Number(response.headers.get('content-length')??0)
 if(size>limit){await response.body?.cancel();throw Error('Source response exceeds the capture limit.')}
 const reader=response.body?.getReader();if(!reader)return ''
 const chunks:Uint8Array[]=[];let total=0
 try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit)throw Error('Source response exceeds the capture limit.');chunks.push(value)}}finally{await reader.cancel()}
 const output=new Uint8Array(total);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length}
 return new TextDecoder('utf-8',{fatal:true}).decode(output)
}
async function dns(name:string,type:'TXT'|'A'|'AAAA') {
 const url=new URL('https://cloudflare-dns.com/dns-query');url.searchParams.set('name',name);url.searchParams.set('type',type)
 const response=await fetch(url,{headers:{accept:'application/dns-json'},redirect:'manual',signal:AbortSignal.timeout(5000)})
 if(!response.ok)throw Error('Public DNS verification is unavailable.')
 const answer=JSON.parse(await limitedText(response,24000)) as {Status?:number;Answer?:{type:number;data:string}[]}
 if(answer.Status!==0)throw Error('Public DNS verification did not return a successful answer.')
 return answer.Answer??[]
}
function parseXml(source:string):any{
 if(/<!DOCTYPE|<!ENTITY/i.test(source)||XMLValidator.validate(source)!==true)throw Error('The source sitemap or RSS is not safe, valid XML.')
 return new XMLParser({ignoreAttributes:false,parseTagValue:false,trimValues:true}).parse(source)
}
function title(html:string):string {
 const walk=(node:any):string|undefined=>node.tagName==='title'?(node.childNodes??[]).map((child:any)=>child.value??'').join(''):(node.childNodes??[]).map(walk).find(Boolean)
 return (walk(parse(html))??'Imported page').trim().slice(0,120)
}
function links(html:string):string[]{
 const output:string[]=[]
 const walk=(node:any)=>{if(node.tagName==='a'){const href=node.attrs?.find((attr:any)=>attr.name==='href')?.value;if(href)output.push(href)};for(const child of node.childNodes??[])walk(child)}
 walk(parse(html));return output
}
export async function crawlChallenge(env:Bindings,actor:{id:string;version:number},input:Record<string,unknown>) {
 const origin=sourceOrigin(input.origin,env.AUTH_ORIGIN)
 if(!providers.includes(input.provider as any))throw Error('Choose Wix, Webflow, Framer or Durable.')
 const value:Challenge={origin,provider:input.provider as Challenge['provider'],actor:actor.id,version:actor.version,expires:Date.now()+15*60000,nonce:base64(crypto.getRandomValues(new Uint8Array(24)))}
 const payload=base64(encoder.encode(JSON.stringify(value))),signature=base64(new Uint8Array(await crypto.subtle.sign('HMAC',await hmac(env.SESSION_SECRET),encoder.encode('pane-import-crawl-v1.'+payload))))
 return {challenge:payload+'.'+signature,expiresAt:new Date(value.expires).toISOString(),record:{type:'TXT',name:'_pane-import.'+new URL(origin).hostname,value:'pane-import='+value.nonce},notice:'Publish this temporary DNS record, then explicitly confirm one crawl. No source request has been made.'}
}
export async function crawlSource(env:Bindings,actor:{id:string;version:number;role:string},input:Record<string,unknown>) {
 if(input.confirm!=='crawl-source')throw Error('Explicit crawl-source confirmation is required.')
 if(typeof input.challenge!=='string'||input.challenge.length>3000)throw Error('Request a fresh domain-control challenge.')
 let challenge:Challenge
 try{
  const [payload,signature,...extra]=input.challenge.split('.')
  if(extra.length||!signature||!await crypto.subtle.verify('HMAC',await hmac(env.SESSION_SECRET),unbase64(signature),encoder.encode('pane-import-crawl-v1.'+payload)))throw Error()
  challenge=JSON.parse(new TextDecoder().decode(unbase64(payload)))
 }catch{throw Error('Invalid domain-control challenge.')}
 const origin=sourceOrigin(challenge.origin,env.AUTH_ORIGIN),host=new URL(origin).hostname
 if(challenge.actor!==actor.id||challenge.version!==actor.version||challenge.expires<=Date.now()||challenge.expires>Date.now()+15*60000||!providers.includes(challenge.provider))throw Error('Domain-control challenge expired or belongs to another operator.')
 const current=await env.DB.prepare("SELECT 1 FROM oa_operators WHERE id=? AND version=? AND role=? AND role IN ('owner','admin') AND status='active'").bind(actor.id,actor.version,actor.role).first()
 if(!current)throw Error('Active native owner or admin authority is required.')
 const proof=await dns('_pane-import.'+host,'TXT')
 if(!proof.some(answer=>answer.type===16&&answer.data.replace(/^"|"$/g,'').replaceAll('" "','')==='pane-import='+challenge.nonce))throw Error('Domain-control TXT record does not match. No source page was requested.')
 const deadline=Date.now()+45000;let requests=0
 const local=(value:string,base=origin):string=>{
  const url=new URL(value,base)
  if(url.origin!==origin||url.username||url.password)throw Error('Source URL leaves the verified HTTPS origin.')
  url.hash='';return url.href
 }
 const captureFailures:Record<string,string>={}
 const get=async(value:string,kind:'xml'|'html')=>{
  const url=local(value)
  if(requests>=maxRequests||Date.now()>deadline)throw Error('Crawl request or time limit reached; this URL was not captured.')
  requests++
  const addresses=(await Promise.all([dns(host,'A'),dns(host,'AAAA')])).flat().filter(answer=>answer.type===1||answer.type===28)
  if(!addresses.length||addresses.some(answer=>!publicAddress(answer.data)))throw Error('Source DNS must resolve only to public Internet addresses.')
  const response=await fetch(url,{method:'GET',headers:{accept:kind==='html'?'text/html':'application/xml, text/xml, application/rss+xml','user-agent':'Pane reviewed site import'},redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(Math.max(1,Math.min(5000,deadline-Date.now())))})
  if(!response.ok){await response.body?.cancel();throw Error('Source returned HTTP '+response.status+'; redirects are not followed.')}
  const contentType=response.headers.get('content-type')??''
  if(kind==='html'&&!/^text\/html(?:;|$)/i.test(contentType)||kind==='xml'&&!/(?:xml|rss)/i.test(contentType)){await response.body?.cancel();throw Error('Source response has an unexpected content type.')}
  return limitedText(response,kind==='html'?maxDocument:50000)
 }
 const inventory=new Set<string>(),pendingMaps=[local('/sitemap.xml')],seenMaps=new Set<string>()
 const add=(value:string,base=origin)=>{try{const url=local(value,base);if(inventory.size<maxUrls)inventory.add(url);else if(!inventory.has(url))throw Error('Crawl URL limit reached. Narrow the source before importing.')}catch(error){if((error as Error).message.startsWith('Crawl URL limit'))throw error}}
 while(pendingMaps.length){
  const url=pendingMaps.shift()!;if(seenMaps.has(url))continue
  if(seenMaps.size>=10)throw Error('Sitemap index exceeds the ten-map capture limit.')
  seenMaps.add(url)
  try{
   const parsed=parseXml(await get(url,'xml'))
   if(parsed.sitemapindex){for(const entry of array(parsed.sitemapindex.sitemap)){if(typeof entry.loc!=='string')throw Error('Sitemap location is missing.');pendingMaps.push(local(entry.loc))}}
   else if(parsed.urlset){for(const entry of array(parsed.urlset.url)){if(typeof entry.loc!=='string')throw Error('Sitemap location is missing.');add(local(entry.loc))}}
   else throw Error('Expected a source URL sitemap.')
  }catch(error){throw Error('Sitemap capture failed: '+(error as Error).message)}
 }
 add(origin+'/')
 let rss:string|undefined
 if(challenge.provider==='wix'||input.rssPath!==undefined){
  if(input.rssPath!==undefined&&typeof input.rssPath!=='string')throw Error('RSS path must be text on the verified source.')
  rss=await get(local(String(input.rssPath??'/blog-feed.xml')),'xml')
  const channel=parseXml(rss)?.rss?.channel
  if(!channel)throw Error('Expected a blog RSS channel.')
  for(const entry of array(channel.item)){if(typeof entry.link!=='string')throw Error('RSS post link is missing.');add(local(entry.link))}
 }
 const documents:{url:string;title:string;html:string}[]=[]
 const collections=input.collections??[]
 const snapshot=()=>({format:challenge.provider+'-snapshot-v1',origin,name:host,sitemap:'<urlset>'+[...inventory].map(url=>'<url><loc>'+url.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</loc></url>').join('')+'</urlset>',...(rss?{rss}:{}),documents,collections,captureFailures})
 for(const url of inventory){
  try{
   const html=await get(url,'html'),document={url,title:title(html),html}
   documents.push(document)
   if(encoder.encode(JSON.stringify(snapshot())).byteLength>maxSource-20000){documents.pop();captureFailures[url]='Source capture exceeds the import byte limit; this page was not imported.';continue}
   for(const link of links(html))add(link,url)
  }catch(error){
   if((error as Error).message.startsWith('Crawl URL limit'))throw error
   captureFailures[url]=(error as Error).message
  }
 }
 const source=JSON.stringify(snapshot())
 if(encoder.encode(source).byteLength>maxSource)throw Error('Capture exceeds the source import limit; narrow the source.')
 // Recheck native authority after network work. Receipt custody is separate from
 // the unchanged draft; only the exact source bytes and actor inherit this proof.
 const hash=sha256(source),verifiedAt=new Date().toISOString()
 const saved=await env.DB.prepare(`INSERT INTO pane_import_crawls(hash,actor,origin,provider,verified_at)
  SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND version=? AND role=? AND role IN ('owner','admin') AND status='active')
  ON CONFLICT(hash,actor) DO UPDATE SET verified_at=excluded.verified_at`)
  .bind(hash,actor.id,origin,challenge.provider,verifiedAt,actor.id,actor.version,actor.role).run()
 if(!saved.meta.changes)throw Error('Operator authority changed during crawl. Nothing was imported.')
 return {source,receipt:{origin,provider:challenge.provider,verifiedAt,requests,hash},notice:'Capture only. Review the import plan and fingerprint before applying an unpublished draft.'}
}
