import {htmlBlockPreview} from '../../public/pane-html-preview.mjs'
import {codePolicy,customCodeWrapper,normalizeCode} from './custom-code'
import type {Page,Site} from './model'
import type {TextBlock} from './sections'
import {escape} from './ui/kit'

export type HtmlBlockCode = {source:string;height:number}
type HtmlBlock = Pick<TextBlock,'id'|'text'> & {html?:HtmlBlockCode}

export function normalizeHtmlBlock(value:unknown):HtmlBlockCode|undefined {
 if(value===undefined)return undefined
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Provide HTML source and a frame height.')
 const input=value as Record<string,unknown>
 if(Object.keys(input).some(key=>!['source','height'].includes(key)))throw Error('Unsupported HTML block field.')
 const source=normalizeCode({html:input.source})?.html
 if(!source)throw Error('Provide HTML source for this block.')
 const height=input.height===undefined?320:input.height
 if(typeof height!=='number'||!Number.isInteger(height)||height<160||height>1200)throw Error('HTML block height must be an integer between 160 and 1,200 pixels.')
 return {source,height}
}

/** This document is only ever loaded inside the opaque double sandbox. */
export function htmlBlockSource(block:HtmlBlock):string {
 const code=normalizeHtmlBlock(block.html)
 if(!code)throw Error('Provide HTML source for this block.')
 return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${escape(codePolicy)}"></head><body>${code.source}</body></html>`
}

export function htmlBlockMarkup(block:HtmlBlock,live:boolean,quiet:boolean):string {
 const title=escape(block.text)
 if(!live)return htmlBlockPreview(block)
 const source=customCodeWrapper(htmlBlockSource(block))
 return `<section class="external-embed html-block" data-html-block="${escape(block.id)}" data-html-source="${escape(source)}" data-html-title="${title}" data-html-quiet="${quiet?'1':'0'}" aria-label="${title}"><h2>${title}</h2><p data-html-status role="status">${quiet?'Your privacy choice keeps HTML code off.':'HTML code stays off until you allow this block. You can turn it off at any time.'}</p><div data-html-frame></div><div class="form-actions"><button type="button" data-html-allow${quiet?' disabled':''}>Allow HTML code</button><button type="button" class="secondary" data-html-deny>Keep HTML code off</button></div></section>`
}

/** Preserve every occurrence so additions, duplication and removal affect authorization. */
export function htmlCodeIdentity(page:Page):{id:string;source:string}[] {
 return (page.sections??[]).flatMap(section=>section.blocks.flatMap(block=>{
  if(String(block.kind)!=='html')return []
  const code=normalizeHtmlBlock((block as HtmlBlock).html)
  if(!code)throw Error('Provide HTML source for this block.')
  return [{id:block.id,source:code.source}]
 }))
}

/** Input for CSP hashing only; this concatenation is never a rendered document. */
export function pageHtmlPolicySource(page:Page):string {
 return (page.sections??[]).flatMap(section=>section.blocks.filter(block=>String(block.kind)==='html').map(block=>htmlBlockSource(block))).join('\n')
}

/** Layout movement preserves source identity; copying or removing code does not. */
export function siteHtmlIdentity(site:Site|null|undefined):string {
 return JSON.stringify((site?.pages??[]).flatMap(page=>{const blocks=htmlCodeIdentity(page).sort((a,b)=>a.id.localeCompare(b.id));return blocks.length?[{page:page.id??page.slug,blocks}]:[]}).sort((a,b)=>a.page.localeCompare(b.page)))
}
