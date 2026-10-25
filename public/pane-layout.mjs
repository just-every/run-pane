import {richMarkup} from './pane-rich.mjs'
// The server and canvas share this renderer. Values have passed section validation.
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const height=value=>({auto:'auto',small:'160px',medium:'320px',large:'480px',full:'100vh'}[value??'auto'])
export function layoutRules(sections){return sections.flatMap(section=>{
 const target=`[data-section="${section.id}"]`,phone=section.phone??{}
 const rules=[`${target}{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:${section.gap}px;padding:${section.paddingTop}px 0 ${section.paddingBottom}px;background:${section.background??'transparent'};min-height:${height(section.height)}}`,...section.blocks.map(block=>`${target} [data-block="${block.id}"]{grid-column:${block.column}/span ${block.span};grid-row:${block.row};z-index:${block.order};text-align:${block.align};align-self:${block.vertical};min-width:0}`)]
 const mobile=`${target}{display:${phone.hidden?'none':'grid'};padding-top:${phone.paddingTop??section.paddingTop}px;padding-bottom:${phone.paddingBottom??section.paddingBottom}px;min-height:${height(phone.height??section.height)}}`+section.blocks.map((block,index)=>{
  const p=block.phone??{}
  return `${target} [data-block="${block.id}"]{display:${p.hidden?'none':'block'};grid-column:${p.column??1}/span ${p.span??12};grid-row:${p.row??index+1};z-index:${p.order??block.order};text-align:${p.align??block.align};align-self:${p.vertical??block.vertical}}`
 }).join('')
 return [...rules,`@container (max-width:700px){${mobile}}`]
})}
export function layoutCss(sections){return layoutRules(sections).join('')}
function blockMarkup(block){
 if(block.kind==='image'){const image=block.image;return `<div data-block="${escape(block.id)}" data-image-block><img src="${escape(image.src)}" width="${image.width}" height="${image.height}" alt="${escape(image.decorative?'':image.alt??'')}"${image.decorative?' role="presentation"':''}></div>`}
 const format=block.format??'p',tag=['p-large','p-small'].includes(format)?'p':format
 return `<${tag} data-block="${escape(block.id)}"${tag!==format?` class="pane-${format}"`:''}>${block.content?richMarkup(block.content):escape(block.text)}</${tag}>`
}
export function layoutMarkup(sections){return sections.map(section=>`<section data-section="${escape(section.id)}"${section.component?` data-component="${escape(section.component)}"`:''}>${section.blocks.map(blockMarkup).join('')}</section>`).join('')}
