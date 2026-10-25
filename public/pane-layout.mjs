import {richMarkup} from './pane-rich.mjs'
// The server and canvas share this renderer. Values have passed section validation.
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function layoutCss(sections){return sections.map(section=>{
 const target=`[data-section="${section.id}"]`
 return `${target}{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:${section.gap}px;padding:${section.paddingTop}px 0 ${section.paddingBottom}px;background:${section.background??'transparent'};min-height:${{auto:'auto',small:'160px',medium:'320px',large:'480px',full:'100vh'}[section.height??'auto']}}`+section.blocks.map(block=>`${target} [data-block="${block.id}"]{grid-column:${block.column}/span ${block.span};grid-row:${block.row};z-index:${block.order};text-align:${block.align};align-self:${block.vertical};min-width:0}`).join('')
 }).join('')}
function blockMarkup(block){
 const format=block.format??'p',tag=['p-large','p-small'].includes(format)?'p':format
 return `<${tag} data-block="${escape(block.id)}"${tag!==format?` class="pane-${format}"`:''}>${block.content?richMarkup(block.content):escape(block.text)}</${tag}>`
}
export function layoutMarkup(sections){return sections.map(section=>`<section data-section="${escape(section.id)}"${section.component?` data-component="${escape(section.component)}"`:''}>${section.blocks.map(blockMarkup).join('')}</section>`).join('')}
