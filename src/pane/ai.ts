import {replaceHtmlSelection} from './ai-html'
import type {Bindings} from '../auth.server'
import type {Revision,Site} from './model'
import {draftRevision,DraftConflict,revision} from './content'
import {aiModes,type AiMode,type AiBindings,type Proposal,type Suggestion} from './ai-types'
import {modelSuggestions} from './ai-model'
import {detachPage,imageTargets,nativeLink,replaceText} from './ai-targets'
import {sectionText} from './sections'
type Stored={id:string;actor:string;base:string;slug:string;mode:AiMode;suggestions:string;decisions:string|null;accepted_revision:string|null;last_revision:string|null;undone:number;created_at:string}
async function latest(db:D1Database){const row=await db.prepare('SELECT * FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1').first();return row?revision(row):null}
async function current(db:D1Database,base:unknown){const row=await latest(db);if(!row||base!==row.id)throw new DraftConflict(row);return row}
const publicProposal=(proposal:Proposal)=>({...proposal,suggestions:proposal.suggestions.map(({page,media,...suggestion})=>suggestion)})
export async function proposeAi(env:Bindings&AiBindings,actor:string,input:Record<string,unknown>){
 if(input.consent!==true)throw Error('Explicit permission to send this page to OpenAI is required.')
 if(!aiModes.includes(input.mode as AiMode))throw Error('Choose a supported assistance mode.')
 const row=await current(env.DB,input.base),page=row.site.pages.find(page=>!page.deleted&&page.slug===input.slug)
 if(!page)throw Error('Choose a current page.')
 const output=await modelSuggestions(env,row.site,page,input.mode as AiMode,input)
 // Never attach an answer to a newer revision, even if the model call was already billed.
 await current(env.DB,input.base)
 const proposal:Proposal={id:crypto.randomUUID(),base:row.id,slug:page.slug,mode:input.mode as AiMode,suggestions:output.suggestions}
 await env.DB.prepare('INSERT INTO pane_ai_proposals(id,actor,base,slug,mode,suggestions,created_at) VALUES(?,?,?,?,?,?,?)').bind(proposal.id,actor,row.id,page.slug,proposal.mode,JSON.stringify(proposal.suggestions),new Date().toISOString()).run()
 return {...publicProposal(proposal),model:output.model,usage:output.usage}
}
function applySuggestion(site:Site,slug:string,suggestion:Suggestion){
 const page=site.pages.find(page=>page.slug===slug)!
 const {kind,target,after}=suggestion
 if(kind==='finding')throw Error('Findings are read-only; they cannot change structured data.')
 if(kind==='translation'){
  if(!suggestion.page)throw Error('Translation is incomplete.')
  if(site.pages.some(page=>page.slug===suggestion.page!.slug))throw Error('Translated page already exists.')
  site.pages.push(structuredClone(suggestion.page));if(suggestion.media?.length)site.media=[...(site.media??[]),...structuredClone(suggestion.media)];return
 }
 detachPage(page)
 if(kind==='search-title')page.search={...page.search,title:after}
 else if(kind==='search-description')page.search={...page.search,description:after}
 else if(kind==='heading')replaceText(page,target,after)
 else if(kind==='link')page.links=[...(page.links??[]),{label:after,url:nativeLink(site,target)}]
 else if(kind==='text'){
  if(page.importedHtml){if(!replaceHtmlSelection(page,suggestion.before!,after))throw Error('The selected imported text no longer exists.')}
  else if(page.sections){const block=page.sections.flatMap(section=>section.blocks).find(block=>block.kind==='text'&&block.text===suggestion.before);if(!block)throw Error('The selected text no longer exists.');replaceText(page,'block:'+block.id,after)}
  else {if(!suggestion.before||!page.body.includes(suggestion.before))throw Error('The selected text no longer exists.');page.body=page.body.replace(suggestion.before,after)}
 }else if(kind==='alt'){
  const image=imageTargets(site,page).find(image=>image.target===target)
  if(!image)throw Error('The selected image no longer exists.')
  image.image.alt=after;image.image.decorative=false
  if(target.startsWith('block:'))page.sections!.flatMap(section=>section.blocks).find(block=>block.id===target.slice(6))!.text=after
  if(page.sections)page.body=sectionText(page.sections)
 }
}
async function owned(db:D1Database,actor:string,id:unknown){
 const row=await db.prepare('SELECT * FROM pane_ai_proposals WHERE id=? AND actor=?').bind(String(id??''),actor).first<Stored>()
 if(!row)throw Error('Proposal not found for this owner.')
 return row
}
/** The guarded revision insert and decision journal commit in the same D1 batch. */
export async function decideAi(env:Bindings,actor:string,input:Record<string,unknown>){
 const proposal=await owned(env.DB,actor,input.id),base=await current(env.DB,input.base)
 if(proposal.decisions!==null)throw Error('This proposal already has a recorded decision.')
 if(proposal.base!==base.id)throw new DraftConflict(base)
 const suggestions=JSON.parse(proposal.suggestions) as Suggestion[],decisions=input.decisions as {id:string;accept:boolean}[]
 if(!Array.isArray(decisions)||decisions.length!==suggestions.length||new Set(decisions.map(decision=>decision?.id)).size!==suggestions.length||suggestions.some(suggestion=>!decisions.some(decision=>decision?.id===suggestion.id&&typeof decision.accept==='boolean')))throw Error('Accept or reject every suggestion exactly once.')
 const accepted=suggestions.filter(suggestion=>decisions.find(decision=>decision.id===suggestion.id)!.accept)
 const site=structuredClone(base.site)
 for(const suggestion of accepted)applySuggestion(site,proposal.slug,suggestion)
 if(!accepted.length){
  const result=await env.DB.prepare(`UPDATE pane_ai_proposals SET decisions=? WHERE id=? AND decisions IS NULL AND (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=?`).bind(JSON.stringify(decisions),proposal.id,base.id).run()
  if(!result.meta.changes)throw new DraftConflict(await latest(env.DB))
  return {id:proposal.id,revision:base,accepted:0}
 }
 const row=await draftRevision(crypto.randomUUID(),actor,site,new Date(Math.max(Date.now(),Date.parse(base.created_at)+1)).toISOString())
 const results=await env.DB.batch([
  env.DB.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? AND EXISTS(SELECT 1 FROM pane_ai_proposals WHERE id=? AND decisions IS NULL)`).bind(row.id,JSON.stringify(row.site),row.hash,actor,row.created_at,base.id,proposal.id),
  env.DB.prepare(`UPDATE pane_ai_proposals SET decisions=?,accepted_revision=?,last_revision=? WHERE id=? AND decisions IS NULL AND EXISTS(SELECT 1 FROM pane_revisions WHERE id=?)`).bind(JSON.stringify(decisions),row.id,row.id,proposal.id,row.id),
 ])
 if(!results[0].meta.changes)throw new DraftConflict(await latest(env.DB))
 return {id:proposal.id,revision:row,accepted:accepted.length}
}
export async function undoAi(env:Bindings,actor:string,input:Record<string,unknown>){
 const proposal=await owned(env.DB,actor,input.id),base=await current(env.DB,input.base)
 if(!proposal.accepted_revision||proposal.last_revision!==base.id)throw new DraftConflict(base)
 const target=await env.DB.prepare('SELECT * FROM pane_revisions WHERE id=?').bind(proposal.undone?proposal.accepted_revision:proposal.base).first()
 if(!target)throw Error('Original revision is unavailable.')
 const row=await draftRevision(crypto.randomUUID(),actor,revision(target).site,new Date(Math.max(Date.now(),Date.parse(base.created_at)+1)).toISOString())
 const results=await env.DB.batch([
  env.DB.prepare(`INSERT INTO pane_revisions(id,site,hash,actor,created_at) SELECT ?,?,?,?,? WHERE (SELECT id FROM pane_revisions ORDER BY created_at DESC,id DESC LIMIT 1)=? AND EXISTS(SELECT 1 FROM pane_ai_proposals WHERE id=? AND last_revision=?)`).bind(row.id,JSON.stringify(row.site),row.hash,actor,row.created_at,base.id,proposal.id,base.id),
  env.DB.prepare(`UPDATE pane_ai_proposals SET last_revision=?,undone=? WHERE id=? AND last_revision=? AND EXISTS(SELECT 1 FROM pane_revisions WHERE id=?)`).bind(row.id,proposal.undone?0:1,proposal.id,base.id,row.id),
 ])
 if(!results[0].meta.changes)throw new DraftConflict(await latest(env.DB))
 return {id:proposal.id,revision:row,undone:!proposal.undone}
}
