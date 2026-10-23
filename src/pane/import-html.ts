import { parse } from 'parse5'
import type { Fidelity } from './import-report'

export function htmlFidelity(html:string,base:string,contentOnly=false,directParagraphs=false):Fidelity{
 const document=parse(html),result:Fidelity={text:'',links:[],headings:[],lists:[],images:[],buttons:[],formatting:[],unresolved:[]}
 const address=(value:string,kind:string):string|undefined=>{
  try{return new URL(value,base).href}catch{result.unresolved!.push('Invalid '+kind+' URL: '+value);return undefined}
 }
 const find=(node:any):any=>node.attrs?.some((a:any)=>a.name==='class'&&a.value.split(/\s+/).includes('public-content'))?node:(node.childNodes??[]).map(find).find(Boolean)
 const root:any=contentOnly?find(document):document
 if(!root)return result
 const attr=(node:any,key:string)=>node.attrs?.find((a:any)=>a.name===key)?.value??''
 const ignored=(node:any)=>['head','script','style','template','noscript'].includes(node.tagName)||node.attrs?.some((a:any)=>a.name==='hidden')
 const blocks=new Set(['p','div','section','article','main','header','footer','nav','h1','h2','h3','h4','h5','h6','li','ul','ol','blockquote','figure','figcaption','br','tr'])
 const content=(node:any):string=>node.nodeName==='#text'?node.value:ignored(node)?'':(blocks.has(node.tagName)?'\n':'')+(node.childNodes??[]).map(content).join('')+(blocks.has(node.tagName)?'\n':'')
 const walk=(node:any)=>{
  if(ignored(node))return
  if(node.tagName==='a'){const href=attr(node,'href');if(href){const url=address(href,'link');if(url)result.links.push(url)}}
  if(/^h[1-6]$/.test(node.tagName??''))result.headings.push(node.tagName+':'+content(node).replace(/\s+/g,' ').trim())
  if(['ol','ul'].includes(node.tagName))result.lists.push(node.tagName+':'+(node.childNodes??[]).filter((n:any)=>n.tagName==='li').map(content).join('|'))
  if(node.tagName==='button'||node.tagName==='input'&&['submit','button'].includes(attr(node,'type')))result.buttons.push(attr(node,'formaction')||'Interactive button without a portable destination')
  if(['strong','em','b','i','u','s','blockquote','video','iframe','table','figure'].includes(node.tagName))result.formatting.push(node.tagName)
  if(node.tagName==='img'){const src=attr(node,'src');if(src){const url=address(src,'image');if(url)result.images.push(url)}else result.unresolved!.push('Image has no source URL.')}
  for(const child of node.childNodes??[])walk(child)
 }
 walk(root);result.text=(directParagraphs?(root.childNodes??[]).filter((node:any)=>node.tagName==='p').map(content).join(' '):content(root)).replace(/\s+/g,' ').trim();return result
}

/** Form destinations are inventory data; no recipient or action is activated. */
export function htmlForms(html:string,base:string):string[]{
 const destinations:string[]=[]
 const walk=(node:any)=>{
  if(node.tagName==='form')destinations.push(node.attrs?.find((a:any)=>a.name==='action')?.value||base)
  for(const child of node.childNodes??[])walk(child)
 }
 walk(parse(html));return destinations
}
