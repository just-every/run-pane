for(const root of document.querySelectorAll('[data-site-style-settings]')){
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
  const frame=root.querySelector('[data-style-preview]'),link=root.querySelector('[data-style-preview-link]')
  const url=new URL(link.href);url.pathname=url.pathname.replace(/^\/preview\/[^/]+/,'/preview/'+event.detail.id);link.href=url.href;frame.src=url.href
 })
 render()
}
