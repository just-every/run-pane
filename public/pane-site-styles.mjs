export const inheritedSectionFields=['gap','paddingTop','paddingBottom','background']
export function effectiveSection(section,styles){
 const values={gap:24,paddingTop:32,paddingBottom:32,sectionBackground:'#ffffff',...styles},result={...section}
 for(const field of section.defaults??[])result[field]=field==='background'?values.sectionBackground:values[field]
 return result
}
for(const root of typeof document==='undefined'?[]:document.querySelectorAll('[data-site-style-settings]')){
 const form=root.closest('form'),field=root.querySelector('[data-font-state]'),upload=root.querySelector('[data-font-upload]'),status=root.querySelector('[data-font-status]')
 function render(){
  const fonts=JSON.parse(field.value)
  for(const select of root.querySelectorAll('[data-font-choice]')){
   const selected=select.value
   select.querySelectorAll('[data-uploaded]').forEach(option=>option.remove())
   for(const font of fonts){let option=[...select.options].find(option=>option.value===font.id);if(!option){option=new Option(font.name,font.id);option.dataset.uploaded='';select.add(option)}}
   select.value=selected
  }
  const list=root.querySelector('[data-uploaded-fonts]');list.replaceChildren()
  for(const font of fonts){const row=document.createElement('p');row.textContent=font.name+' · '+font.format.toUpperCase();list.append(row)}
 }
 upload.addEventListener('change',async()=>{
  const file=upload.files?.[0];if(!file)return
  upload.disabled=true;status.textContent='Checking font…'
  try{
   const format=file.name.split('.').at(-1).toLowerCase(),fonts=JSON.parse(field.value)
   if(!['woff2','woff','ttf','otf'].includes(format)||file.size>393216||fonts.length>=4)throw Error('Choose a WOFF2, WOFF, TTF or OTF font up to 384 KiB, with up to four fonts per revision.')
   const bytes=new Uint8Array(await file.arrayBuffer());await new FontFace('Pane-upload',bytes).load();let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte)
   fonts.push({id:'font-'+crypto.randomUUID(),name:file.name.replace(/\.[^.]+$/,'').slice(0,80),format,data:btoa(binary)})
   field.value=JSON.stringify(fonts);render();field.dispatchEvent(new Event('input',{bubbles:true}));status.textContent='Font added to draft. Choose it for headings or body text.'
  }catch(error){status.textContent=error.message}finally{upload.disabled=false;upload.value=''}
 })
 form.addEventListener('draftrestore',render)
 form.addEventListener('panedraftsaved',event=>{
  const preview=document.querySelector('[data-style-preview]'),link=root.querySelector('[data-style-preview-link]'),message=root.querySelector('[data-style-status]')
  const url=new URL(link.href);url.pathname=url.pathname.replace(/^\/preview\/[^/]+/,'/preview/'+event.detail.id);link.href=url.href
  if(!preview)return
  for(const site of preview.querySelectorAll('.public-site'))site.toggleAttribute('data-site-styles',!!event.detail.site.styles)
  let sheet=preview.querySelector('[data-style-sheet]')
  if(!sheet){sheet=document.createElement('link');sheet.rel='stylesheet';sheet.dataset.styleSheet='';preview.append(sheet)}
  const requested=url.pathname+'?pane-style-css=1'
  sheet.onload=()=>{if(new URL(sheet.href).pathname!==url.pathname)return;preview.querySelectorAll('style[data-pane-layout]').forEach(style=>style.remove());message.textContent='Desktop preview updated.'}
  sheet.onerror=()=>{message.textContent='Preview could not update. Open the saved preview to see this draft.'}
  sheet.href=requested
 })
 render()
}
