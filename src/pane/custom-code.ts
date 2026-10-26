import {normalizeTags,tagsFromForm} from './tags'
import { pagePath } from './pages'
import { typedForm } from './forms'
import { parseFragment } from 'parse5'
import type { Site, Page } from './model'
import { escape } from './ui/kit'
export type CustomCode = {css?:string; html?:string; header?:string; footer?:string; tags?:string}
export function normalizeCode(value:unknown):CustomCode|undefined {
 if(value===undefined)return undefined
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provide custom code fields.')
 const code:CustomCode={}
 for(const [key,text] of Object.entries(value)){
  if(!['css','html','header','footer','tags'].includes(key)||typeof text!=='string'||text.length>20000)throw Error('Custom code fields are limited to 20,000 characters.')
  if(key==='tags'){code.tags=normalizeTags(text);continue}
  if((text.match(/<script\b/gi)?.length??0)>32||(text.match(/<style\b/gi)?.length??0)>32)throw Error('Use at most 32 scripts and styles in a code field.')
  if(key==='css'&&(/[\\@]|url\s*\(|(?:image-set|image|src)\s*\(/i.test(text)||text.includes('<')))throw Error('Custom CSS cannot request resources or escape the stylesheet. Use local style rules without imports, resource functions or escapes.')
  if(text.trim())code[key as keyof CustomCode]=text.replace(/\r\n?/g,'\n')
 }
 return Object.keys(code).length?code:undefined
}
export const codeRelay="addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='pane:goal')document.querySelector('iframe').contentWindow.postMessage(event.data,'*')})"
export function customCodeWrapper(source:string):string {
 const policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src about:; form-action 'none'; base-uri 'none'"
 return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${escape(policy)}"><script>${codeRelay}</script><iframe title="Isolated owner code" sandbox="allow-scripts" referrerpolicy="no-referrer" width="100%" height="100%" frameborder="0" srcdoc="${escape(source)}"></iframe>`
}
export const codePolicy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'"
export function customCodeMarkup(site:Site,page:Page,live:boolean,quiet:boolean):string {
 if(![site.customCode,page.customCode].some(code=>code&&['css','html','header','footer'].some(key=>code[key as keyof CustomCode])))return ''
 if(!live)return '<p>Custom code is disabled in workspace and draft previews.</p>'
 if(quiet)return '<p>Custom code is off for this privacy choice.</p>'
 const source=customCodeSource(site,page)
 return `<section class="external-embed" data-custom-code data-source="${escape(customCodeWrapper(source))}" data-thank-goals="${escape(JSON.stringify(thankGoals(site,page)))}" data-page="${escape(page.slug)}" data-css="${escape(customCss(site,page))}" data-verifications="${escape(JSON.stringify(verificationTags(site,page)))}" aria-label="Custom code choices"><p data-code-status role="status">Third-party custom code stays off until you allow analytics. You can withdraw in this session.</p><div data-code-frame></div><div class="form-actions"><button type="button" data-code-allow>Allow custom code</button><button type="button" class="secondary" data-code-deny>Keep custom code off</button></div></section><script src="/pane-custom-code.js" defer></script>`
}
export function codeFromForm(input:Record<string,unknown>,saved:CustomCode|undefined,prefix:string):CustomCode|undefined {
 const tags=prefix==='code.site.'?tagsFromForm(input,saved?.tags):saved?.tags
 if(!['css','html','header','footer'].some(key=>input[prefix+key]!==undefined))return tags===saved?.tags?saved:normalizeCode({...saved,tags})
 return normalizeCode({...Object.fromEntries(['css','html','header','footer'].map(key=>[key,input[prefix+key]??saved?.[key as keyof CustomCode]??''])),...(tags?{tags}:{})})
}

export function customCodeSource(site:Site,page:Page):string {
 if(![site.customCode,page.customCode].some(code=>code&&['css','html','header','footer'].some(key=>code[key as keyof CustomCode])))return ''
 const code=site.customCode??{},local=page.customCode??{}
 const bridge=`<script>addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='pane:goal')dispatchEvent(new CustomEvent('pane:goal',{detail:event.data.detail}))})</script>`
 return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${escape(codePolicy)}">${bridge}<style>${customCss(site,page)}</style>${code.header??''}${local.header??''}</head><body>${code.html??''}${local.html??''}${code.footer??''}${local.footer??''}</body></html>`
}

export async function codeHashes(source:string,tag='script'):Promise<string[]> {
 const scripts=[...(tag==='script'?[codeRelay]:[]),...[...source.matchAll(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'\\s*>','gi'))].map(match=>match[1])]
 return Promise.all([...new Set(scripts)].map(async text=>"'sha256-"+btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))))+"'"))
}

export function customCss(site:Site,page:Page):string {return [site.customCode?.css,page.customCode?.css].filter(Boolean).join('\n')}
/** Only inert verification metadata crosses the frame boundary, never executable header HTML. */
export function verificationTags(site:Site,page:Page):{name:string;content:string}[] {
 const fragment=parseFragment((site.customCode?.header??'')+(page.customCode?.header??''))
 const tags:{name:string;content:string}[]=[]
 for(const node of fragment.childNodes){
  if(!('tagName' in node)||node.tagName!=='meta')continue
  const attrs=Object.fromEntries(node.attrs.map(attr=>[attr.name,attr.value]))
  if(attrs.name&&/^[a-z0-9_-]*verification[a-z0-9_-]*$/i.test(attrs.name)&&attrs.content!==undefined)tags.push({name:attrs.name,content:attrs.content})
 }
 return tags
}

function thankGoals(site:Site,page:Page):{page:string;name:string;value:number}[] {
 return site.pages.flatMap(source=>{
  const redirect=typedForm(site,source.slug)?.redirect
  if(redirect?redirect!==pagePath(site,page.slug):source.slug!==page.slug)return []
  return (site.goals??[]).filter(goal=>goal.type==='form'&&goal.page===source.slug).map(goal=>({page:source.slug,name:goal.name,value:1}))
 })
}
export function codeConfirmation(site:Site,slug:string,redirect?:string):string {
 if(!redirect)return pagePath(site,slug)+'?sent=1'
 const target=site.pages.find(page=>pagePath(site,page.slug)===redirect)
 return target&&(site.customCode||target.customCode)?redirect+'?sent='+encodeURIComponent(slug):redirect
}
