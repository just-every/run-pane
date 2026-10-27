import {linkedBody,bodyEmbed} from './pane-body-markup.mjs'
import {galleryMarkup} from './pane-gallery-markup.mjs'
import {richMarkup} from './pane-rich.mjs'
// The server and canvas share this renderer. Values have passed section validation.
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const height=value=>({auto:'auto',small:'160px',medium:'320px',large:'480px',full:'100vh'}[value??'auto'])
export function layoutRules(sections){return sections.flatMap(section=>{
 const target=`[data-section="${section.id}"]`,phone=section.phone??{}
 const rules=[`${target} [data-image-block],${target} [data-quote-block]{margin:0}`,`${target}{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:${section.gap}px;padding:${section.paddingTop}px 0 ${section.paddingBottom}px;background:${section.background??'transparent'};min-height:${height(section.height)}}`,...section.blocks.map(block=>`${target} [data-block="${block.id}"]{grid-column:${block.column}/span ${block.span};grid-row:${block.row};z-index:${block.order};text-align:${block.align};align-self:${block.vertical};min-width:0}`)]
 const mobile=`${target}{display:${phone.hidden?'none':'grid'};gap:${phone.gap??section.gap}px;padding-top:${phone.paddingTop??section.paddingTop}px;padding-bottom:${phone.paddingBottom??section.paddingBottom}px;min-height:${height(phone.height??section.height)}}`+section.blocks.map((block,index)=>{
  const p=block.phone??{}
  return `${target} [data-block="${block.id}"]{display:${p.hidden?'none':'block'};grid-column:${p.column??1}/span ${p.span??12};grid-row:${p.row??index+1};z-index:${p.order??block.order};text-align:${p.align??block.align};align-self:${p.vertical??block.vertical}}`
 }).join('')
 for(const block of section.blocks){
  if(block.gallery){const g=block.gallery;rules.push(`${target} [data-block="${block.id}"]{--gallery-columns:${g.columns};--gallery-phone-columns:${g.phoneColumns};--gallery-gap:${g.gap}px;--gallery-phone-gap:${g.phoneGap}px}`)}
  const image=block.image,crop=image?.crop
  if(!image)continue
  if(!crop){rules.push(`${target} [data-block="${block.id}"] img{aspect-ratio:${image.width}/${image.height}}`);continue}
  const ratio=crop.ratio==='original'?`${image.width}/${image.height}`:crop.ratio==='free'?`${crop.width}/${crop.height}`:crop.ratio.replace(':','/')
  rules.push(`${target} [data-block="${block.id}"] img{aspect-ratio:${ratio};object-fit:cover;object-position:${crop.x}% ${crop.y}%}`)
 }
 return [...rules,`@container (max-width:700px){${mobile}}`]
})}
export function layoutCss(sections){return layoutRules(sections).join('')}
function blockMarkup(block,index,imageUrl,media,options){
 const resolve=options?.resolveLink,attributes=`data-block="${escape(block.id)}" data-block-type="${block.kind==='text'?(block.format?.match(/^h[1-4]$/)?'heading':block.format==='pre'?'code':'text'):block.kind}" data-reading-index="${index}"`
 if(block.kind==='line')return `<hr ${attributes} data-catalog-block>`
 if(block.kind==='spacer')return `<div ${attributes} data-catalog-block aria-hidden="true" style="height:${block.size}px"></div>`
 if(block.kind==='accordion')return `<details ${attributes} data-catalog-block><summary>${escape(block.summary)}</summary><p>${escape(block.text)}</p></details>`
 if(block.kind==='video')return `<div ${attributes} data-video-block>${bodyEmbed(block,options?.embedMarkup)}</div>`
 if(block.kind==='button')return `<div ${attributes} data-button-block>${linkedBody(escape(block.text),block.link,resolve,true)}</div>`
 if(block.kind==='quote'||block.attribution!==undefined)return `<figure ${attributes} data-quote-block><blockquote data-block-text>${block.content?richMarkup(block.content,resolve):escape(block.text)}</blockquote>${block.attribution?`<figcaption>${escape(block.attribution)}</figcaption>`:''}</figure>`
 if(block.kind==='gallery')return galleryMarkup(block,index,imageUrl,media)
 if(block.kind==='image'){const image=block.image;const picture=`<img src="${escape(imageUrl?imageUrl(block.id,0):image.src)}"${image.renditions?.length?` srcset="${image.renditions.map(item=>escape(imageUrl?imageUrl(block.id,item.width):item.src)+' '+item.width+'w').join(', ')}" sizes="(max-width: 700px) 100vw, 1100px"`: ''} loading="${imageUrl?'lazy':'eager'}" decoding="async" width="${image.width}" height="${image.height}" alt="${escape(image.decorative?'':image.alt??'')}"${image.decorative?' role="presentation"':''}>`;return `<figure ${attributes} data-image-block>${linkedBody(picture,block.link,resolve)}${block.caption?`<figcaption>${escape(block.caption)}</figcaption>`:''}</figure>`}
 const format=block.format??'p',tag=['p-large','p-small'].includes(format)?'p':format
 return `<${tag} data-block="${escape(block.id)}" data-block-type="${block.format?.match(/^h[1-4]$/)?'heading':block.format==='pre'?'code':'text'}" data-reading-index="${index}"${tag!==format?` class="pane-${format}"`:''}>${block.content?richMarkup(block.content,resolve):escape(block.text)}</${tag}>`
}
export function layoutMarkup(sections,imageUrl,media,options){return sections.map(section=>`<section data-section="${escape(section.id)}" id="${escape(section.anchor??'section-'+section.id)}"${section.component?` data-component="${escape(section.component)}"`:''}>${section.blocks.map((block,index)=>blockMarkup(block,index,imageUrl,media,options)).join('')}</section>`).join('')}
