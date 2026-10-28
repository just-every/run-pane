import { activePages, pagePath } from './pages'
import { htmlFidelity } from './import-html'
import { publicPage } from './public-view'
import type { Site } from './model'

export const importKinds = ['page','post','comment','collection-item','event','gallery','media','product','form','author','taxonomy','menu','unsupported','enquiry','visit-baseline'] as const
export type ImportKind = typeof importKinds[number]
export type Fidelity = { text: string; links: string[]; headings: string[]; lists: string[]; images: string[]; buttons: string[]; formatting: string[]; unresolved?: string[]; anchors?: string[] }
export type InventoryItem = { id: string; kind: ImportKind; title: string; oldUrl?: string; targetSlug?: string; state?: string; reason?: string; destination?: string; fidelity?: Fidelity; fields?: Record<string,string> }
export type ImportDocument = { site: Site | null; items: InventoryItem[]; format: string; origin?: string; crawl?: {origin:string;verifiedAt:string}; historyRows?: import('./import-history-source').HistoryRow[] }
export type ImportIssue = { id: string; check: string; reason: string }
export type MigrationReport = {
 phase: 'preflight'|'applied'|'undone'; format: string;
 counts: Record<string,{source:number;planned:number;applied:number|null;exceptions:number}>;
 inventory: (InventoryItem & { target: string|null })[]; failures: ImportIssue[];
 history: string[]; ok: boolean; revision?: string; crawl?: {origin:string;verifiedAt:string}
}
const anchorName=(hash:string)=>{try{return decodeURIComponent(hash.slice(1))}catch{return ''}}
const normalizeText = (value: string) => value.normalize('NFC').replace(/\s+/g,' ').trim()

/** A report describes only observed writes. Unsupported source items stay in custody,
 * never become invented posts, media downloads or successful provider deliveries. */
export function migrationReport(input: ImportDocument, actual?: Site|null, phase: MigrationReport['phase']='preflight', revision?: string): MigrationReport {
 const expected=input.site
 const planned=new Map(expected?activePages(expected).map(page=>[page.slug,page]):[])
 const observed=new Map(actual?activePages(actual).map(page=>[page.slug,page]):[])
 const renderedPages=new Map(actual?activePages(actual).map(page=>[page.slug,htmlFidelity(publicPage(actual,page.slug,'live',true,true),'https://destination.invalid',true,input.format==='static-site-json-v1'&&!page.importedHtml)]):[])
 const counts: MigrationReport['counts'] = Object.fromEntries([...importKinds,'comment:approved','comment:pending','comment:spam','comment:other'].map(kind=>[kind,{source:0,planned:0,applied:phase==='preflight'?null:0,exceptions:0}]))
 const failures: ImportIssue[]=[]
 const inventory=input.items.map(item=>{
  const target=item.kind==='page'&&item.targetSlug&&planned.has(item.targetSlug)?pagePath(expected!,item.targetSlug):null
  const applied=phase==='applied'&&!!item.targetSlug&&observed.has(item.targetSlug)&&!!target
  const buckets=[counts[item.kind],...(item.kind==='comment'?[counts['comment:'+(['approved','pending','spam'].includes(item.state??'')?item.state:'other')]]:[])]
  for(const count of buckets){count.source++;if(target)count.planned++;if(!target||item.reason)count.exceptions++;if(applied)count.applied=(count.applied??0)+1}
  if(phase==='applied'){
   const fail=(check:string,reason:string)=>failures.push({id:item.id,check,reason})
   if(target&&item.reason)fail('fidelity',item.reason)
   for(const reason of item.fidelity?.unresolved??[])fail('source-reference',reason)
   if(target){
    const wanted=planned.get(item.targetSlug!)!, found=observed.get(item.targetSlug!)
    if(!found)fail('inventory','Planned page is absent from the imported draft.')
    else {
     if(normalizeText(found.body)!==normalizeText(wanted.body)||found.title!==wanted.title)fail('text','Stored text differs from the reviewed page.')
     if(JSON.stringify(found)!==JSON.stringify(wanted))fail('fields','Stored page fields differ from the reviewed snapshot.')
     // Use the production renderer, not the input snapshot, for DOM fidelity.
     // Native JSON bodies are plain text with separately declared page links;
     // captured HTML must retain its whole visible body, including link labels.
     const rendered=renderedPages.get(found.slug)!
     if(item.fidelity&&normalizeText(rendered.text)!==normalizeText(item.fidelity.text))fail('rendered-text','The rendered draft text differs from the source after whitespace normalization.')
     if(input.format!=='static-site-json-v1'){
      if(input.format==='wordpress-wxr')fail('rendered-document-text','Full-page text cannot be compared: the export supplies body content without a published-page capture.')
      else if(item.fidelity&&normalizeText(htmlFidelity(publicPage(actual!,found.slug,'live',true,true),'https://destination.invalid').text)!==normalizeText(item.fidelity.text))fail('rendered-document-text','The complete new page text differs from the captured page, including native navigation and page framing. Review the whole page before publishing.')
     }
     const sourceLinks=item.fidelity?.links??[]
     for(const href of sourceLinks){
      const sourceUrl=new URL(href,new URL(item.oldUrl??'/',input.origin??'https://source.invalid'))
      const mapped=input.items.find(candidate=>candidate.oldUrl===sourceUrl.href.split('#')[0]&&candidate.targetSlug)
      const expectedLink=input.origin&&sourceUrl.origin===input.origin&&mapped?new URL(pagePath(expected!,mapped.targetSlug!)+sourceUrl.hash,'https://destination.invalid').href:new URL(href,'https://destination.invalid').href
      if(!rendered.links.includes(expectedLink))fail('rendered-link','The rendered draft is missing the source destination: '+href)
     }
     if(item.fidelity?.headings.length&&JSON.stringify(rendered.headings)!==JSON.stringify(item.fidelity.headings))fail('rendered-heading','The rendered draft has different heading levels or text.')
     if(item.fidelity?.lists.length&&JSON.stringify(rendered.lists)!==JSON.stringify(item.fidelity.lists))fail('rendered-list','The rendered draft has different list types or items.')
     if(item.fidelity?.images.length&&JSON.stringify(rendered.images)!==JSON.stringify(item.fidelity.images))fail('rendered-image','The rendered draft is missing source inline images; their placement, captions and alt text cannot be preserved.')
     if(item.fidelity?.formatting.length&&JSON.stringify(rendered.formatting)!==JSON.stringify(item.fidelity.formatting))fail('rendered-formatting','The rendered draft has different inline formatting or unsupported rich elements.')
     if(item.fidelity?.buttons.length&&JSON.stringify(rendered.buttons)!==JSON.stringify(item.fidelity.buttons))fail('rendered-button','The rendered draft is missing the source button controls.')
     if(item.oldUrl&&/^https?:/.test(item.oldUrl))fail('redirect','The old URL is mapped but its live redirect has not been verified; a separate cutover is required.')

    }
   } else fail('inventory',item.reason??'No native destination for this source item.')
   for(const link of item.fidelity?.links??[]){
    let url:URL
    try{url=new URL(link,new URL(item.oldUrl??'/',input.origin??'https://source.invalid'))}catch{fail('link','Invalid source destination: '+link);continue}
    const nativeLink=input.format==='static-site-json-v1'&&(/^\/site(?:[/?#]|$)/.test(link)||url.origin==='https://source.invalid'&&/^\/site(?:[/?#]|$)/.test(url.pathname))
    if(nativeLink){
     if(!actual||!activePages(actual).some(page=>pagePath(actual,page.slug)===url.pathname))fail('link','Dangling internal target: '+link)
     else if(url.hash&&!renderedPages.get(activePages(actual!).find(page=>pagePath(actual!,page.slug)===url.pathname)!.slug)?.anchors?.includes(anchorName(url.hash)))fail('anchor','The target section anchor could not be preserved: '+link)
     continue
    }
    const internal=input.origin?url.origin===input.origin:url.origin==='https://source.invalid'
    if(internal){
     const mapped=input.items.find(candidate=>{if(!candidate.oldUrl||!candidate.targetSlug)return false;const sourceUrl=new URL(candidate.oldUrl,input.origin??'https://source.invalid');return sourceUrl.origin===url.origin&&sourceUrl.pathname===url.pathname&&sourceUrl.search===url.search})
     if(!mapped?.targetSlug||!observed.has(mapped.targetSlug))fail('link','Dangling internal target: '+url.href)
     else if(url.hash&&!renderedPages.get(mapped.targetSlug)?.anchors?.includes(anchorName(url.hash)))fail('anchor','The target section anchor could not be preserved: '+url.href)
    }
   }
   if(target&&!observed.get(item.targetSlug!)?.importedHtml){
    const found=observed.get(item.targetSlug!)
    for(const href of item.fidelity?.links??[]){
     const url=new URL(href,new URL(item.oldUrl??'/',input.origin??'https://source.invalid'))
     let expectedLink=href
     if(input.origin&&url.origin===input.origin){const mapped=input.items.find(candidate=>candidate.oldUrl===url.href.split('#')[0]&&candidate.targetSlug);if(mapped)expectedLink=pagePath(expected!,mapped.targetSlug!)+url.hash}
     if(!found?.links?.some(link=>link.url===expectedLink))fail('link','Source destination is not present in the stored page: '+href)
    }
   }
   if(target&&!observed.get(item.targetSlug!)?.importedHtml&&input.format!=='static-site-json-v1'&&item.fidelity?.links.length)fail('link-placement','Source links are separate page links; their original inline positions and labels could not be preserved.')
   if(item.fidelity?.buttons.length)fail('button','Source button controls could not be recreated in the plain-text draft.')
   if(!observed.get(item.targetSlug!)?.importedHtml&&item.fidelity?.formatting.length)fail('formatting','Inline formatting and rich layout could not be preserved in the plain-text draft.')
   if(!observed.get(item.targetSlug!)?.importedHtml&&item.fidelity?.headings.length)fail('heading','Heading levels could not be preserved in the plain-text draft.')
   if(!observed.get(item.targetSlug!)?.importedHtml&&item.fidelity?.lists.length)fail('list','List structure could not be preserved in the plain-text draft.')
   if(item.fidelity?.images.length)fail('inline-image','Inline image positions, captions and alt text could not be recreated in the draft.')
   if(item.kind==='media')fail('media','Media was not fetched. Image storage and responsive copies are not available in this importer.')
  }
  return {...item,target}
 })
 if(phase==='applied'&&JSON.stringify(expected)!==JSON.stringify(actual))failures.push({id:'site',check:'snapshot',reason:'Imported snapshot differs from the reviewed site.'})
 return {phase,format:input.format,counts,inventory,failures,history:[
  'Traffic and sales analytics history stays with the old platform; no historical metrics are imported.',
  'Source forms and notification destinations are reported only. No recipient, subscriber or marketing permission is activated.',
  input.crawl?'The published source was explicitly crawled after DNS control proof. Applying this retained capture makes no further source request or cutover.':'Unsupported content and the original export stay in the import history. The old host is unchanged; no cutover or outbound fetch occurs.',
  'Old URLs are a reviewed map only. Redirects on the old domain need a separate verified cutover; this import does not change DNS.'
 ],...(input.crawl?{crawl:input.crawl}:{}),ok:phase==='applied'&&failures.length===0,...(revision?{revision}:{})}
}
