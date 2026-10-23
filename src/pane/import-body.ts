import { parse } from 'parse5'
import { htmlFidelity } from './import-html'
import { escape } from './ui/kit'

const elements=new Set(['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','b','em','i','u','s','blockquote','a','br','hr','figure','figcaption','span','div','section','article','main','header','footer','nav','pre','code'])
const inert=new Set(['head','script','style','template','noscript','iframe','video','audio','svg','math'])
const invalid=/[\u0000-\u0020\\]|%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i
export function importedLink(value:string):string|undefined {
 if(!value||invalid.test(value))return undefined
 if(/^\/site(?:[/?#]|$)/.test(value))return value
 try{const url=new URL(value);if(url.username||url.password)return undefined;if(['http:','https:','mailto:','tel:','sms:'].includes(url.protocol))return url.href}catch{}
 return undefined
}
/** Rebuild a small semantic document from parsed data. Stored HTML is never
 * injected directly, and media remains inert until a native asset copy exists. */
export function importedBody(html:string,options:{base?:string;link?:(href:string)=>string|undefined;retainMedia?:boolean;navigation?:boolean;prefixIds?:string}={}):string {
 if(typeof html!=='string'||html.length>100000)throw Error('Imported body exceeds its structured-content limit.')
 const seen=new Set<string>();let nodes=0
 const attr=(node:any,name:string)=>node.attrs?.find((entry:any)=>entry.name===name)?.value??''
 const document=parse(html)
 const walk=(node:any,depth:number):string=>{
  if(++nodes>10000||depth>60)throw Error('Imported body is too deeply nested or complex.')
  if(node.nodeName==='#text')return escape(node.value)
  if(inert.has(node.tagName)||node.attrs?.some((entry:any)=>entry.name==='hidden'))return ''
  const children=()=> (node.childNodes??[]).map((child:any)=>walk(child,depth+1)).join('')
  if(['html','body',undefined].includes(node.tagName))return children()
  let tag=node.tagName
  if(tag==='img'){
   const alt=attr(node,'alt'),src=attr(node,'src')
   let url:string|undefined
   try{const source=new URL(src,options.base);if(['http:','https:'].includes(source.protocol)&&!source.username&&!source.password)url=source.href}catch{}
   if(options.retainMedia)return '<img'+(url?' src="'+escape(url)+'"':'')+' alt="'+escape(alt)+'">'
   return '<span role="img" aria-label="'+escape(alt||'Source image unavailable')+'"></span>'
  }
  // Retain visible labels from forms/widgets without activating them.
  if(!elements.has(tag))return children()
  const attrs:string[]=[]
  const id=attr(node,'id')
  if(/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(id)&&id!=='main'&&!seen.has(id)){attrs.push('id="'+escape((options.prefixIds??'')+id)+'"');seen.add(id)}
  if(tag==='a'){
   let href=attr(node,'href')
   try{if(options.base&&href)href=new URL(href,options.base).href}catch{href=''}
   href=options.link?options.link(href)??'':href
   const safe=importedLink(href)??(options.navigation&&!invalid.test(href)&&/^(?:\.\/[a-z0-9%/-]+(?:[?#][^\s<>]*)?|\/app\?page=[a-z0-9%/-]+(?:[&#][^\s<>]*)?)$/i.test(href)?href:undefined)
   if(!safe)return '<span'+(attrs.length?' '+attrs.join(' '):'')+'>'+children()+'</span>'
   attrs.push('href="'+escape(safe)+'"')
   if(attr(node,'target')==='_blank')attrs.push('target="_blank"','rel="noopener noreferrer"')
  }
  if(tag==='ol'&&/^[1-9][0-9]{0,5}$/.test(attr(node,'start')))attrs.push('start="'+attr(node,'start')+'"')
  const open='<'+tag+(attrs.length?' '+attrs.join(' '):'')+'>'
  return open+(['br','hr'].includes(tag)?'':children()+'</'+tag+'>')
 }
 return walk(document,0)
}
export const importedText=(html:string)=>htmlFidelity(html,'https://destination.invalid').text
