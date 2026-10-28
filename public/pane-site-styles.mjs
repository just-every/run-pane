export const siteStyleDefaults={headingFont:'figtree',bodyFont:'figtree',primary:'#e8176e',heading:'#1f0717',text:'#4a3a45',background:'#ffffff',button:'rounded',gap:24,paddingTop:32,paddingBottom:32,sectionBackground:'#ffffff'}
export const inheritedSectionFields=['gap','paddingTop','paddingBottom','background']
const fonts={figtree:"'Figtree','Helvetica Neue',Arial,sans-serif",georgia:'Georgia,serif',system:'system-ui,sans-serif',mono:"'JetBrains Mono',ui-monospace,monospace"}
export function effectiveSection(section,styles){
 const values={...siteStyleDefaults,...styles},result={...section}
 for(const field of section.defaults??[])result[field]=field==='background'?values.sectionBackground:values[field]
 return result
}
export function siteStyleCss(styles){
 if(!styles)return ''
 const s={...siteStyleDefaults,...styles},scope='.rer-themed .pane .public-site',content=scope+' .public-content',radius={square:'0',rounded:'12px',pill:'999px'}[s.button]
 const rgb=[1,3,5].map(index=>parseInt(s.primary.slice(index,index+2),16)/255),luminance=rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),buttonText=luminance>.179?'#000000':'#ffffff'
 return `${scope}{--pn-font:${fonts[s.bodyFont]};--pn-ink:${s.heading};--pn-body:${s.text};--pn-action:${s.primary};color:${s.text};background:${s.background};font-family:${fonts[s.bodyFont]}}${scope} :is(h1,h2,h3,h4,.public-brand){font-family:${fonts[s.headingFont]};color:${s.heading}}${scope} :is(p,li,blockquote){color:${s.text}}${scope} .button{border-radius:${radius}}${content} .button.pane-button-primary,${content} .contact-form button{background:${s.primary};color:${buttonText};border-color:${s.primary}}${content} .button.pane-button-secondary{color:${s.primary};border-color:${s.primary};background:transparent}${content} .button.pane-button-tertiary{color:${s.primary};background:transparent;border-color:transparent}`
}
