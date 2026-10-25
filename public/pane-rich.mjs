// Structured text is shared by the browser and the immutable server renderer.
export function richText(nodes){
 const read=items=>items.map(node=>node.tag==='text'?node.text:node.tag==='br'?'\n':(['ul','ol'].includes(node.tag)?'\n':'')+read(node.children)+(['p','p-large','p-small','h1','h2','h3','h4','blockquote','pre','li'].includes(node.tag)?'\n':'')).join('')
 return read(nodes).trim()
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export const richMarkup=nodes=>nodes.map(node=>{
 if(node.tag==='text')return escape(node.text)
 const tag=['p-large','p-small'].includes(node.tag)?'p':node.tag
 if(tag==='br')return '<br>'
 return `<${tag}${tag!==node.tag?` class="pane-${node.tag}"`:''}>${richMarkup(node.children)}</${tag}>`
}).join('')
