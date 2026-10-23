import { activePages, pagePath } from './pages'
import type { Site } from './model'

export const importKinds = ['page','post','comment','collection-item','event','gallery','media','product','form','author','taxonomy','menu','unsupported'] as const
export type ImportKind = typeof importKinds[number]
export type Fidelity = { text: string; links: string[]; headings: string[]; lists: string[]; images: string[]; buttons: string[]; formatting: string[] }
export type InventoryItem = { id: string; kind: ImportKind; title: string; oldUrl?: string; targetSlug?: string; state?: string; reason?: string; destination?: string; fidelity?: Fidelity; fields?: Record<string,string> }
export type ImportDocument = { site: Site | null; items: InventoryItem[]; format: string; origin?: string }
export type ImportIssue = { id: string; check: string; reason: string }
export type MigrationReport = {
 phase: 'preflight'|'applied'|'undone'; format: string;
 counts: Record<string,{source:number;planned:number;applied:number|null;exceptions:number}>;
 inventory: (InventoryItem & { target: string|null })[]; failures: ImportIssue[];
 history: string[]; ok: boolean; revision?: string
}
const normalizeText = (value: string) => value.normalize('NFC').replace(/\s+/g,' ').trim()

/** A report describes only observed writes. Unsupported source items stay in custody,
 * never become invented posts, media downloads or successful provider deliveries. */
export function migrationReport(input: ImportDocument, actual?: Site|null, phase: MigrationReport['phase']='preflight', revision?: string): MigrationReport {
 const expected=input.site
 const planned=new Map(expected?activePages(expected).map(page=>[page.slug,page]):[])
 const observed=new Map(actual?activePages(actual).map(page=>[page.slug,page]):[])
 const counts: MigrationReport['counts'] = Object.fromEntries([...importKinds,'comment:approved','comment:pending','comment:spam','comment:other'].map(kind=>[kind,{source:0,planned:0,applied:phase==='preflight'?null:0,exceptions:0}]))
 const failures: ImportIssue[]=[]
 const inventory=input.items.map(item=>{
  const target=item.kind==='page'&&item.targetSlug&&planned.has(item.targetSlug)?pagePath(expected!,item.targetSlug):null
  const applied=phase==='applied'&&!!item.targetSlug&&observed.has(item.targetSlug)&&!!target
  const buckets=[counts[item.kind],...(item.kind==='comment'?[counts['comment:'+(['approved','pending','spam'].includes(item.state??'')?item.state:'other')]]:[])]
  for(const count of buckets){count.source++;if(target)count.planned++;else count.exceptions++;if(applied)count.applied=(count.applied??0)+1}
  if(phase==='applied'){
   const fail=(check:string,reason:string)=>failures.push({id:item.id,check,reason})
   if(target){
    const wanted=planned.get(item.targetSlug!)!, found=observed.get(item.targetSlug!)
    if(!found)fail('inventory','Planned page is absent from the imported draft.')
    else {
     if(normalizeText(found.body)!==normalizeText(wanted.body)||found.title!==wanted.title)fail('text','Stored text differs from the reviewed page.')
     if(JSON.stringify(found)!==JSON.stringify(wanted))fail('fields','Stored page fields differ from the reviewed snapshot.')
    }
   } else fail('inventory',item.reason??'No native destination for this source item.')
   for(const link of item.fidelity?.links??[]){
    let url:URL
    try{url=new URL(link,new URL(item.oldUrl??'/',input.origin??'https://source.invalid'))}catch{fail('link','Invalid source destination: '+link);continue}
    const internal=input.origin?url.origin===input.origin:url.origin==='https://source.invalid'
    if(internal){
     const mapped=input.items.find(candidate=>candidate.oldUrl&&new URL(candidate.oldUrl,input.origin??'https://source.invalid').pathname===url.pathname)
     if(!mapped?.targetSlug||!observed.has(mapped.targetSlug))fail('link','Dangling internal target: '+url.href)
     else if(url.hash)fail('anchor','The target section anchor could not be preserved: '+url.href)
    }
   }
   if(target){
    const found=observed.get(item.targetSlug!)
    for(const href of item.fidelity?.links??[]){
     const url=new URL(href,new URL(item.oldUrl??'/',input.origin??'https://source.invalid'))
     let expectedLink=href
     if(input.origin&&url.origin===input.origin){const mapped=input.items.find(candidate=>candidate.oldUrl===url.href.split('#')[0]&&candidate.targetSlug);if(mapped)expectedLink=pagePath(expected!,mapped.targetSlug!)+url.hash}
     if(!found?.links?.some(link=>link.url===expectedLink))fail('link','Source destination is not present in the stored page: '+href)
    }
   }
   if(target&&item.fidelity?.links.length)fail('link-placement','Source links are separate page links; their original inline positions and labels could not be preserved.')
   if(item.fidelity?.buttons.length)fail('button','Source button controls could not be recreated in the plain-text draft.')
   if(item.fidelity?.formatting.length)fail('formatting','Inline formatting and rich layout could not be preserved in the plain-text draft.')
   if(item.fidelity?.headings.length)fail('heading','Heading levels could not be preserved in the plain-text draft.')
   if(item.fidelity?.lists.length)fail('list','List structure could not be preserved in the plain-text draft.')
   if(item.fidelity?.images.length)fail('inline-image','Inline image positions, captions and alt text could not be recreated in the draft.')
   if(item.kind==='media')fail('media','Media was not fetched. Image storage and responsive copies are not available in this importer.')
  }
  return {...item,target}
 })
 if(phase==='applied'&&JSON.stringify(expected)!==JSON.stringify(actual))failures.push({id:'site',check:'snapshot',reason:'Imported snapshot differs from the reviewed site.'})
 return {phase,format:input.format,counts,inventory,failures,history:[
  'Traffic and sales analytics history stays with the old platform; no historical metrics are imported.',
  'Source forms and notification destinations are reported only. No recipient, subscriber or marketing permission is activated.',
  'Unsupported content and the original export stay in the import history. The old host is unchanged; no cutover or outbound fetch occurs.',
  'Old URLs are a reviewed map only. Redirects on the old domain need a separate verified cutover; this import does not change DNS.'
 ],ok:phase==='applied'&&failures.length===0,...(revision?{revision}:{})}
}
