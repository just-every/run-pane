import { assertNoCredentials } from '../modules/import-kit/src/provenance/identity.ts'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { importedBody, importedText } from './import-body'
import { htmlFidelity, htmlForms } from './import-html'
import { normalizeSite } from './content'
import { pagePath, cleanSlug } from './pages'
import { importKinds, type ImportDocument, type InventoryItem, type ImportKind } from './import-report'
import type { Site, Page } from './model'

const text=(v:unknown)=>typeof v==='string'?v:''
const array=(v:any):any[]=>v===undefined?[]:Array.isArray(v)?v:[v]
const reasons:Partial<Record<ImportKind,string>>={post:'Blog posts are not supported by this importer yet; the source post is retained.',comment:'Comments and their threading and moderation state remain in the source export; no comments were created.',media:'Media was not fetched. Image storage and responsive copies are not available in this importer.','collection-item':'Collection items are retained as source rows; no collection destination is available.',event:'Events are retained in the source inventory; no event destination is available.',gallery:'Gallery layouts and captions are retained in the source inventory only.',product:'Product handoff to Stall is not available; no product was created.',form:'Forms and notification delivery were not recreated; review the original destination before moving.',author:'Author profiles are retained in the source inventory only.',taxonomy:'Categories and tags are retained in the source inventory only.',menu:'Source menus require an explicit navigation mapping.'}
function xml(source:string):any {
 if(/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('XML declarations of document types or entities are not accepted.')
 if(XMLValidator.validate(source)!==true)throw Error('Invalid XML export.')
 const value=new XMLParser({ignoreAttributes:false,parseTagValue:false,trimValues:false,processEntities:true}).parse(source)
 assertNoCredentials(value);return value
}
function sourceUrl(value:unknown,origin?:string):string|undefined{
 if(value===undefined||value==='')return undefined
 if(typeof value!=='string')throw Error('Source URLs must be text.')
 let u:URL;try{u=new URL(value,origin)}catch{throw Error('Invalid source URL.')}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Source URLs need HTTP(S) without credentials.')
 return u.href
}
function originUrl(value:unknown):string|undefined{return sourceUrl(value)?new URL(String(value)).origin:undefined}
function fillPage(item:InventoryItem,slug:string,body:string,pages:Page[],html?:string){
 try{cleanSlug(slug);if(pages.some(page=>page.slug===slug))throw Error('Duplicate page address.');if(!item.title.trim()||!body.trim())throw Error('A page needs a title and visible text.');if(item.title.length>120||body.length>20000)throw Error('Page exceeds native title/body limits.');pages.push({slug,title:item.title,body,...(html!==undefined?{importedHtml:html}:{})});item.targetSlug=slug}catch(error){item.reason=(error as Error).message}
}
function finish(format:string,name:string,description:string,pages:Page[],items:InventoryItem[],origin?:string):ImportDocument{
 let site=pages.length?normalizeSite({name,description,pages:pages.map(({importedHtml,...page})=>page)}):null
 if(site)for(const item of items.filter(item=>item.targetSlug)){
  const page=site.pages.find(page=>page.slug===item.targetSlug)!,source=pages.find(page=>page.slug===item.targetSlug)!.importedHtml
  if(source!==undefined){
   const html=importedBody(source,{base:item.oldUrl??origin,retainMedia:true,link:href=>{
    let url:URL;try{url=new URL(href)}catch{return undefined}
    if(origin&&url.origin===origin){const mapped=items.find(candidate=>candidate.oldUrl===url.href.split('#')[0]&&candidate.targetSlug);return mapped?pagePath(site!,mapped.targetSlug!)+url.hash:undefined}
    return href
   }})
   page.importedHtml=html;page.body=importedText(html)
   if(!page.body.trim()){delete item.targetSlug;item.reason='No supported visible body remains after inert source widgets are removed.';continue}
   const lost=[...(item.fidelity?.images.length?['Original media has no native copy; images remain inert.']:[]),...(item.fidelity?.buttons.length?['Interactive source buttons are not activated.']:[]),...(item.fidelity?.unresolved??[])]
   item.reason='Imported headings, lists and inline links are preserved with Pane styling. Original visual layout and unsupported widgets are not recreated.'+(lost.length?' '+lost.join(' '):'')
  }
 }
 if(site){site.pages=site.pages.filter(page=>items.some(item=>item.targetSlug===page.slug));if(!site.pages.length)site=null}
 return {site:site?normalizeSite(site):null,items,format,...(origin?{origin}:{})}
}
function wordpress(source:string):ImportDocument{
 const channel=xml(source)?.rss?.channel
 if(!channel||!['1.2','1.1','1.0'].includes(text(channel['wp:wxr_version']).trim()))throw Error('Expected a WordPress WXR export.')
 const origin=originUrl(channel['wp:base_site_url']??channel.link),items:InventoryItem[]=[],pages:Page[]=[]
 for(const [index,entry] of array(channel.item).entries()){
  const type=text(entry['wp:post_type']),kind:ImportKind=type==='page'?'page':type==='post'?'post':type==='attachment'?'media':type==='nav_menu_item'?'menu':'unsupported'
  const oldUrl=sourceUrl(kind==='media'?(entry['wp:attachment_url']??entry.link):entry.link,origin),html=text(entry['content:encoded']),fidelity=htmlFidelity(html,oldUrl??origin??'https://source.invalid')
  const item:InventoryItem={id:'wxr-'+(text(entry['wp:post_id'])||index),kind,title:text(entry.title)||type,...(oldUrl?{oldUrl}:{}),fidelity,...(kind!=='page'?{reason:reasons[kind]??'Unsupported WordPress post type: '+type}:{})}
  if(kind==='page')fillPage(item,text(entry['wp:post_name']),fidelity.text,pages,html)
  if(/\[[a-z][\w-]*(?:[\s\]]|\/)/i.test(html))items.push({id:item.id+'-shortcodes',kind:'unsupported',title:item.title,reason:'WordPress shortcodes/plugin blocks are retained as source text, not executed.'})
  items.push(item)
  for(const [n,action] of htmlForms(html,oldUrl??origin??'https://source.invalid').entries())items.push({id:item.id+'-form-'+n,kind:'form',title:'Form on '+item.title,...(oldUrl?{oldUrl}:{}),destination:action,reason:reasons.form})
  for(const [n,comment] of array(entry['wp:comment']).entries()){
   const state=({'1':'approved','0':'pending',spam:'spam'} as Record<string,string>)[text(comment['wp:comment_approved'])]??'other'
   items.push({id:item.id+'-comment-'+(text(comment['wp:comment_id'])||n),kind:'comment',title:'Comment on '+item.title,state,reason:reasons.comment,fields:{parent:text(comment['wp:comment_parent']),post:item.id,date:text(comment['wp:comment_date_gmt'])}})
  }
  for(const [n,reason] of (fidelity.unresolved??[]).entries())items.push({id:item.id+'-reference-'+n,kind:reason.startsWith('Invalid image')||reason==='Image has no source URL.'?'media':'unsupported',title:'Unresolved reference on '+item.title,reason})
  for(const [n,url] of fidelity.images.entries())items.push({id:item.id+'-image-'+n,kind:'media',title:'Inline image',oldUrl:url,reason:reasons.media})
 }
 for(const [n,author] of array(channel['wp:author']).entries())items.push({id:'author-'+n,kind:'author',title:text(author['wp:author_display_name'])||text(author['wp:author_login']),reason:reasons.author})
 for(const key of ['wp:category','wp:tag','wp:term'])for(const [n,term] of array(channel[key]).entries())items.push({id:key+'-'+n,kind:'taxonomy',title:text(term['wp:cat_name']??term['wp:tag_name']??term['wp:term_name']),reason:reasons.taxonomy})
 return finish('wordpress-wxr',text(channel.title)||'Imported WordPress site',text(channel.description).slice(0,500),pages,items,origin)
}
function staticJson(raw:any):ImportDocument{
 const site=normalizeSite(raw),origin=originUrl(raw.migration?.origin),items:InventoryItem[]=site.pages.map((page,index)=>({id:'page-'+index,kind:'page',title:page.title,...(!page.deleted?{targetSlug:page.slug}:{reason:'Deleted source page is retained in trash, not an active page.'}),oldUrl:sourceUrl(raw.pages[index].oldUrl,origin)??pagePath(site,page.slug),fidelity:page.importedHtml?htmlFidelity(page.importedHtml,'https://source.invalid'):{text:page.body,links:page.links?.map(link=>link.url)??[],headings:[],lists:[],images:[],buttons:[],formatting:[]}}))
 if(raw.migration!==undefined&&(!raw.migration||typeof raw.migration!=='object'||Array.isArray(raw.migration)))throw Error('Migration inventory must be an object.')
 const inventory=raw.migration?.items??[]
 if(!Array.isArray(inventory)||inventory.length>2000)throw Error('Migration inventory needs at most 2,000 items.')
 for(const [index,entry] of inventory.entries()){
  if(!entry||!importKinds.includes(entry.kind)||typeof entry.title!=='string')throw Error('Each inventory item needs a supported kind and title.')
  const item:InventoryItem={id:'inventory-'+index,kind:entry.kind,title:entry.title,reason:reasons[entry.kind as ImportKind]??'Inventory-only item has no native mapping.',...(entry.oldUrl?{oldUrl:sourceUrl(entry.oldUrl,origin)}:{}),...(entry.state?{state:String(entry.state)}:{}),...(entry.destination?{destination:String(entry.destination)}:{})}
  if(entry.html!==undefined){if(typeof entry.html!=='string')throw Error('Inventory HTML must be text.');item.fidelity=htmlFidelity(entry.html,item.oldUrl??origin??'https://source.invalid')}
  items.push(item)
 }
 // Fields the native normalizer does not keep must be named, never silently lost.
 const known=new Set(['schemaVersion','migration',...Object.keys(site)])
 for(const key of Object.keys(raw))if(!known.has(key))items.push({id:'field-'+key,kind:'unsupported',title:key,reason:'No site-field mapping for '+key+'.'})
 for(const [index,page] of raw.pages.entries())for(const key of Object.keys(page))if(key!=='oldUrl'&&!(key in site.pages[index]))items.push({id:'page-'+index+'-'+key,kind:'unsupported',title:page.title+' / '+key,reason:'No active page-field mapping for '+key+'.'})
 return {site,items,format:'static-site-json-v1',...(origin?{origin}:{})}
}
/** Exported HTML/sitemap/RSS captures are data, never authority to crawl a host. */
function snapshot(raw:any):ImportDocument {
 if(!['wix-snapshot-v1','webflow-snapshot-v1','framer-snapshot-v1','durable-snapshot-v1'].includes(raw.format))throw Error('Unsupported import snapshot format.')
 const origin=originUrl(raw.origin)
 if(!origin||!Array.isArray(raw.documents)||raw.documents.length>1000)throw Error('A snapshot needs its source origin and at most 1,000 captured documents.')
 const items:InventoryItem[]=[],pages:Page[]=[],sitemap=new Set<string>(),posts=new Set<string>()
 const locations=(value:any):string[]=>array(value).flatMap(node=>node&&typeof node==='object'?array(node.loc).filter(v=>typeof v==='string'):[])
 if(raw.sitemap!==undefined){if(typeof raw.sitemap!=='string')throw Error('Sitemap must be XML text.');const parsed=xml(raw.sitemap);if(parsed.sitemapindex)throw Error('Capture a flattened URL sitemap, including all child sitemaps.');if(!parsed.urlset)throw Error('Expected a URL sitemap.');for(const value of locations(parsed.urlset.url))sitemap.add(sourceUrl(value,origin)!)}
 if(raw.rss!==undefined){if(typeof raw.rss!=='string')throw Error('RSS must be XML text.');const channel=xml(raw.rss)?.rss?.channel;if(!channel)throw Error('Expected an RSS channel.');for(const post of array(channel.item)){const url=sourceUrl(post.link,origin);if(!url)throw Error('Each RSS item needs a URL.');posts.add(url)}}
 const seen=new Set<string>()
 for(const [index,doc] of raw.documents.entries()){
  const url=sourceUrl(doc?.url,origin)
  if(!url||new URL(url).origin!==origin||new URL(url).hash||seen.has(url)||typeof doc.html!=='string')throw Error('Each captured document needs unique same-origin URL and HTML text.')
  seen.add(url)
  const fidelity=htmlFidelity(doc.html,url)
  if(doc.kind!==undefined&&!['page','post','collection-item','event','gallery'].includes(doc.kind))throw Error('Captured content kind must be page, post, collection-item, event or gallery.')
  const kind:ImportKind=posts.has(url)?'post':doc.kind??'page'
  const item:InventoryItem={id:'document-'+index,kind,title:text(doc.title)||'Imported page',oldUrl:url,fidelity}
  if(kind!=='page')item.reason=reasons[kind]
  else {
   const path=new URL(url).pathname.replace(/^\/+|\/+$/g,'')||'home'
   fillPage(item,path,fidelity.text,pages,doc.html)
  }
  items.push(item)
  for(const [n,reason] of (fidelity.unresolved??[]).entries())items.push({id:item.id+'-reference-'+n,kind:reason.startsWith('Invalid image')||reason==='Image has no source URL.'?'media':'unsupported',title:'Unresolved reference on '+item.title,reason})
  for(const [n,image] of fidelity.images.entries())items.push({id:item.id+'-image-'+n,kind:'media',title:'Source image',oldUrl:image,reason:reasons.media})
  for(const [n,action] of htmlForms(doc.html,url).entries())items.push({id:item.id+'-form-'+n,kind:'form',title:'Form on '+item.title,oldUrl:url,destination:action,reason:reasons.form})
 }
 for(const url of new Set([...sitemap,...posts]))if(!seen.has(url))items.push({id:'missing-'+items.length,kind:posts.has(url)?'post':'page',title:url,oldUrl:url,reason:(posts.has(url)?'RSS post has no captured HTML; '+reasons.post:'Sitemap URL has no captured HTML.')+(typeof raw.captureFailures?.[url]==='string'?' '+raw.captureFailures[url]:'')})
 if(raw.format==='wix-snapshot-v1'){
  if(raw.sitemap===undefined||raw.rss===undefined)throw Error('A Wix capture needs its published URL sitemap and blog RSS.')
  items.push({id:'crawl-authority',kind:'unsupported',title:'Live crawl and domain-control proof',reason:'This upload is an offline capture. Ownership has not been verified, and the live site has not been crawled.'})
 }
 if(raw.collections!==undefined&&!Array.isArray(raw.collections))throw Error('Collections must be a list of named CSV exports.')
 for(const [collectionIndex,collection] of (raw.collections??[]).entries()){
  if(!collection||typeof collection.name!=='string'||typeof collection.csv!=='string')throw Error('Each collection needs a name and CSV text.')
  const rows=csvRows(collection.csv),header=rows.shift()
  if(!header?.length||header.some(value=>!value)||new Set(header).size!==header.length)throw Error('Collection CSV needs unique, nonempty field names.')
  for(const [n,row] of rows.entries()){
   if(row.length!==header.length)throw Error('Collection CSV row '+(n+2)+' has the wrong field count.')
   const fields=Object.fromEntries(header.map((field,i)=>[field,row[i]])),urlField=header.find(field=>['url','link','source url'].includes(field.toLowerCase()))
   const oldUrl=urlField&&fields[urlField]?sourceUrl(fields[urlField],origin):undefined
   items.push({id:'collection-'+collectionIndex+'-row-'+(n+2),kind:'collection-item',title:collection.name+' / row '+(n+2),fields,...(oldUrl?{oldUrl}:{}),reason:reasons['collection-item']})
  }
 }
 return finish(raw.format,text(raw.name)||'Imported site',text(raw.description),pages,items,origin)
}
/** Quoted CSV fields retain commas, escaped quotes, CRLF and embedded newlines. */
function csvRows(source:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false
 const cell=()=>{row.push(field);field='';closed=false},line=()=>{cell();if(row.some(value=>value!==''))rows.push(row);row=[]}
 source=source.replace(/^\uFEFF/,'')
 for(let i=0;i<source.length;i++){
  const c=source[i]
  if(quoted){if(c!=='"')field+=c;else if(source[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}
  else if(c===',')cell()
  else if(c==='\r'||c==='\n'){line();if(c==='\r'&&source[i+1]==='\n')i++}
  else if(closed){if(c!==' '&&c!=='\t')throw Error('Text after CSV closing quote.')}
  else if(c==='"'){if(field)throw Error('CSV quote must start a field.');quoted=true}
  else field+=c
 }
 if(quoted)throw Error('Unclosed CSV quote.');line();return rows
}
export function parseImportDocument(source:string):ImportDocument{
 if(typeof source!=='string'||new TextEncoder().encode(source).byteLength>512000)throw Error('Move-in accepts an export up to 512,000 bytes.')
 if(source.trimStart().startsWith('<'))return wordpress(source)
 let raw:any;try{raw=JSON.parse(source)}catch{throw Error('Move-in expects a JSON site object or a WordPress WXR XML export.')}
 assertNoCredentials(raw)
 if(raw?.format)return snapshot(raw)
 if(raw?.schemaVersion!==1)throw Error('Expected static-site-json-v1 with schemaVersion 1.')
 return staticJson(raw)
}
