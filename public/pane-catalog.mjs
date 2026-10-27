import {linkedBody} from './pane-body-markup.mjs'
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export const catalogRules=[
 '[data-block-type="audio"]{margin:0}',
 '[data-block-type="audio"] audio{display:block;width:100%;max-width:600px;min-width:0}',
 '[data-block-type="line"]{width:100%;box-sizing:border-box;border:0;border-top:1px solid currentColor}',
 '@keyframes pane-scroll{from{transform:translateX(100%)}to{transform:translateX(-100%)}}',
 '.pane-scroll-line{overflow:hidden}',
 '.pane-site .pane-scroll-line>span{display:inline-block;white-space:nowrap;animation:pane-scroll 15s linear infinite}',
 '@media(prefers-reduced-motion:reduce){.pane-site .pane-scroll-line>span{animation:none}}',
 '[data-block-type="chart"] svg{display:block;width:100%;max-width:600px;height:auto}',
 '[data-block-type="chart"] table{border-collapse:collapse;width:100%}',
 '[data-block-type="chart"] th,[data-block-type="chart"] td{text-align:left;padding:8px}'
]
export function catalogMarkup(block,attributes,options){
 if(block.kind==='search')return `<section ${attributes} data-catalog-block><h2>${escape(block.text)}</h2><form method="get" action="/site/search" role="search" class="contact-form"><label>Search words<input type="search" name="q" maxlength="200"${options?.live?'':' disabled'}></label><button type="submit"${options?.live?'':' disabled'}>Search</button></form></section>`
 if(block.kind==='social-links')return `<div ${attributes} data-catalog-block>${options?.socialMarkup?.()||'<p>Configure social profiles in navigation settings.</p>'}</div>`
 if(block.kind==='scrolling-text')return `<div ${attributes} data-catalog-block><div class="pane-scroll-line"><span>${escape(block.text)}</span></div><button type="button" data-scroll-toggle aria-pressed="false">Pause scrolling</button></div>`
 if(block.kind==='shape'){
  const shape=block.shape,geometry={circle:'<circle cx="50" cy="50" r="46"/>',square:'<rect x="4" y="4" width="92" height="92"/>',triangle:'<polygon points="50,4 96,96 4,96"/>'}[shape.form]
  const svg=`<svg viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="${escape(block.text)}" fill="${shape.outlined?'none':shape.color}" stroke="${shape.color}" stroke-width="3">${geometry}</svg>`
  return `<div ${attributes} data-catalog-block>${linkedBody(svg,block.link,options?.resolveLink)}</div>`
 }
 if(block.kind!=='chart')return ''
 const {type,rows}=block.chart,values=rows.map(row=>row[1]),low=Math.min(0,...values),high=Math.max(0,...values),span=high-low||1,x=value=>20+360*(value-low)/span,y=value=>180-160*(value-low)/span
 let marks=''
 if(type==='bar')marks=rows.map((row,index)=>`<rect x="${Math.min(x(0),x(row[1]))}" y="${10+index*180/rows.length}" width="${Math.abs(x(row[1])-x(0))}" height="${Math.max(2,140/rows.length)}" fill="currentColor"/>`).join('')
 if(type==='line')marks=`<polyline points="${rows.map((row,index)=>(20+index*360/Math.max(1,rows.length-1))+','+y(row[1])).join(' ')}" fill="none" stroke="currentColor" stroke-width="3"/>`+rows.map((row,index)=>`<circle cx="${20+index*360/Math.max(1,rows.length-1)}" cy="${y(row[1])}" r="4" fill="currentColor"/>`).join('')
 if(type==='pie'){
  const total=values.reduce((sum,value)=>sum+value,0);let angle=-Math.PI/2
  marks=rows.map((row,index)=>{const next=angle+2*Math.PI*row[1]/total,start=[200+80*Math.cos(angle),100+80*Math.sin(angle)],end=[200+80*Math.cos(next),100+80*Math.sin(next)],path=row[1]===total?'<circle cx="200" cy="100" r="80"/>':row[1]===0?'':`<path d="M200,100 L${start} A80,80 0 ${next-angle>Math.PI?1:0},1 ${end} Z"/>`;angle=next;return `<g fill="currentColor" opacity="${.25+.75*(index+1)/rows.length}">${path}</g>`}).join('')
 }
 return `<figure ${attributes} data-catalog-block><svg viewBox="0 0 400 200" aria-hidden="true" focusable="false">${marks}</svg><table><caption>${escape(block.text)}</caption><thead><tr><th scope="col">Label</th><th scope="col">Value</th></tr></thead><tbody>${rows.map(([label,value])=>`<tr><th scope="row">${escape(label)}</th><td>${value}</td></tr>`).join('')}</tbody></table></figure>`
}
if(typeof document!=='undefined')for(const button of document.querySelectorAll('[data-scroll-toggle]')){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){button.textContent='Motion paused';button.disabled=true;button.setAttribute('aria-pressed','true')}
 button.addEventListener('click',()=>{const paused=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'Resume scrolling':'Pause scrolling';button.previousElementSibling.firstElementChild.style.animationPlayState=paused?'paused':'running'})
}
