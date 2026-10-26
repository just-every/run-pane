import {parseFragment,serialize} from 'parse5'
import {importedText} from './import-body'
import type {Page} from './model'
const blocks=new Set(['p','div','section','article','main','header','footer','nav','h1','h2','h3','h4','h5','h6','li','ul','ol','blockquote','figure','figcaption','br'])
function textNodes(root:any):any[]{return root.nodeName==='#text'?[root]:(root.childNodes??[]).flatMap(textNodes)}
export function htmlTargets(page:Page){
 const nodes=textNodes(parseFragment(page.importedHtml!))
 return nodes.flatMap((node,index)=>node.value.trim()?[{target:'html:'+index,text:node.value}]:[])
}
export function replaceHtmlTarget(page:Page,target:string,value:string){
 const root=parseFragment(page.importedHtml!),node=textNodes(root)[Number(target.slice(5))]
 if(!node)throw Error('Imported text no longer exists.')
 node.value=(node.value.match(/^\s*/)?.[0]??'')+value+(node.value.match(/\s*$/)?.[0]??'');page.importedHtml=serialize(root);page.body=importedText(page.importedHtml)
}
/** Replace only text nodes; model output never becomes HTML or a destination. */
export function replaceHtmlSelection(page:Page,selection:string,value?:string):boolean{
 const root=parseFragment(page.importedHtml!),nodes=textNodes(root),positions:({node:any;offset:number}|null)[]=[]
 let flattened=''
 const add=(char:string,position:{node:any;offset:number}|null)=>{if(/\s/.test(char)){if(flattened&&!flattened.endsWith(' ')){flattened+=' ';positions.push(null)}}else{flattened+=char;positions.push(position)}}
 const walk=(node:any)=>{
  if(blocks.has(node.tagName))add(' ',null)
  if(node.nodeName==='#text')for(let offset=0;offset<node.value.length;offset++)add(node.value[offset],{node,offset})
  else for(const child of node.childNodes??[])walk(child)
  if(blocks.has(node.tagName))add(' ',null)
 }
 walk(root)
 const text=selection.replace(/\s+/g,' ').trim(),start=flattened.indexOf(text)
 if(start<0)return false
 if(value===undefined)return true
 const first=positions.slice(start,start+text.length).find(Boolean),last=positions.slice(start,start+text.length).findLast(Boolean)
 if(!first||!last)return false
 if(first.node===last.node)first.node.value=first.node.value.slice(0,first.offset)+value+first.node.value.slice(last.offset+1)
 else {
  const from=nodes.indexOf(first.node),to=nodes.indexOf(last.node)
  first.node.value=first.node.value.slice(0,first.offset)+value
  for(let index=from+1;index<to;index++)nodes[index].value=''
  last.node.value=last.node.value.slice(last.offset+1)
 }
 page.importedHtml=serialize(root);page.body=importedText(page.importedHtml)
 return true
}
