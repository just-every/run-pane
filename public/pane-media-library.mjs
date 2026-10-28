import {readImage} from './pane-image.mjs'

const root=document.querySelector('[data-media-library]')
if(root)startLibrary(root)

function startLibrary(root){
 const find=key=>root.querySelector(`[data-library-${key}]`),form=find('metadata'),status=find('status'),grid=find('grid')
 const fields=['name','folder','caption','alt','decorative'],drafts=new Map(),undo=[],redo=[],initial=JSON.parse(find('state').textContent)
 let revision=initial.revision,selected='',timer,busy=false,blocked=false,conflict=null,failed=null,preparing=false
 const key=(kind,id)=>`${kind}:${id}`
 const assets=()=>[...(revision.site.media??[]).map(asset=>({...asset,kind:'image'})),...(revision.site.libraryFiles??[]).map(asset=>({...asset,kind:'pdf'}))]
 const assetFor=value=>assets().find(asset=>key(asset.kind,asset.id)===value)
 const metadata=asset=>({name:asset.name,folder:asset.folder??'',caption:asset.caption??'',alt:asset.image?.alt??'',decorative:asset.image?.decorative??false})
 const values=()=>Object.fromEntries(fields.map(name=>[name,name==='decorative'?form.elements[name].checked:form.elements[name].value]))
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
 const local=asset=>drafts.get(key(asset.kind,asset.id))?.values??metadata(asset)
 const say=message=>{status.textContent=message}
 const dirty=()=>[...drafts.values()].some(draft=>draft.dirty)

 function controls(){
  const paused=busy||preparing||!!conflict
  for(const name of ['upload','place','delete','delete-permanently','undo','redo','save','retry'])find(name).disabled=paused
  find('undo').disabled=paused||!undo.length||dirty();find('redo').disabled=paused||!redo.length||dirty()
  find('retry').hidden=!failed||!!conflict
  find('rebase').disabled=busy;find('latest-select').disabled=busy
  find('metadata-status').textContent=dirty()?'Changes waiting to save.':'Saved'
 }

 function folders(){
  const chosen=find('folder-filter').value,names=[...new Set(assets().map(asset=>local(asset).folder).filter(Boolean))].sort((a,b)=>a.localeCompare(b))
  find('folder-filter').replaceChildren(new Option('All folders',''),new Option('No folder','__unfiled'),...names.map(name=>new Option(name,name)))
  if([...find('folder-filter').options].some(option=>option.value===chosen))find('folder-filter').value=chosen
  root.querySelector('#library-folders').replaceChildren(...names.map(name=>new Option(name,name)))
 }

 function renderGrid(){
  const focus=document.activeElement?.closest('[data-library-item]'),focusKey=focus?key(focus.dataset.kind,focus.dataset.id):''
  const search=find('search').value.trim().toLocaleLowerCase(),type=find('type').value,folder=find('folder-filter').value,all=assets()
  const visible=all.filter(asset=>{const value=local(asset);return (!type||type===asset.kind)&&(!folder||(folder==='__unfiled'?!value.folder:value.folder===folder))&&(!search||[value.name,value.caption,value.alt,value.folder].some(text=>text.toLocaleLowerCase().includes(search)))})
  grid.replaceChildren(...visible.map(asset=>{
   const value=local(asset),button=document.createElement('button');button.type='button';button.className='library-item secondary'
   Object.assign(button.dataset,{libraryItem:'',id:asset.id,kind:asset.kind,libraryId:asset.id,libraryKind:asset.kind,folder:value.folder})
   button.setAttribute('aria-pressed',String(selected===key(asset.kind,asset.id)))
   const preview=asset.kind==='image'?document.createElement('img'):document.createElement('span')
   if(asset.kind==='image'){preview.src=asset.image.renditions?.[0]?.src??asset.image.src;preview.alt='';preview.loading='lazy';preview.width=240;preview.height=160}
   else{preview.className='library-pdf';preview.textContent='PDF';preview.setAttribute('aria-hidden','true')}
   const name=document.createElement('span');name.className='library-item-name';name.textContent=value.name
   const info=document.createElement('span');info.className='library-item-meta';info.textContent=[asset.kind==='image'?'Image':'PDF',value.folder].filter(Boolean).join(' · ')
   button.append(preview,name,info);return button
  }))
  find('count').textContent=`${visible.length} of ${all.length} files`;find('count').dataset.resultCount=String(visible.length);grid.dataset.resultCount=String(visible.length)
  find('empty').hidden=visible.length>0;find('empty').textContent=all.length?'No files match these filters.':'Your library is empty. Upload images or PDFs to start.'
  if(focusKey)grid.querySelector(`[data-id="${CSS.escape(focus.dataset.id)}"][data-kind="${focus.dataset.kind}"]`)?.focus()
 }

 function references(asset){
  const result=[],seen=new Set(),href=`file:${asset.id}`,components=new Map((revision.site.components??[]).map(component=>[component.id,component.section]))
  const linked=nodes=>(nodes??[]).some(node=>node.tag==='a'&&node.href===href||linked(node.children))
  const uses=sections=>(sections??[]).some(section=>(components.get(section.component)??section).blocks.some(block=>asset.kind==='image'?block.gallery?.items.some(item=>item.asset===asset.id):block.link?.href===href||linked(block.content)))
  const add=(page,label,kind='page',slug=page.slug,id=page.id??page.slug)=>{if((uses(page.sections)||asset.kind==='pdf'&&page.links?.some(link=>link.url===href||link.url==='/site/files/'+asset.id))&&!seen.has(`${kind}:${id}`)){seen.add(`${kind}:${id}`);result.push({page:id,title:label??page.title,slug,kind})}}
  for(const page of revision.site.pages)add(page)
  for(const post of revision.site.posts??[])add(post.content,post.content.title,'post',post.content.slug,post.id)
  for(const post of revision.site.blogPosts??[])add(post.content,post.content.title,'post',post.content.slug,post.id)
  for(const collection of revision.site.collections??[])for(const item of collection.items)for(const value of Object.values(item.values))if(value&&typeof value==='object'&&uses(value.sections)){add({sections:value.sections},item.title,'item',`${collection.prefix}/${item.slug}`,item.id);break}
  for(const component of revision.site.components??[])if(uses([component.section])&&!result.some(use=>use.kind==='component'&&use.page===component.id))result.push({page:component.id,title:component.name,slug:'',kind:'component'})
  return [...new Map([...result,...(initial.liveUses?.[key(asset.kind,asset.id)]??[])].map(use=>[JSON.stringify([use.kind,use.page,use.slug]),use])).values()]
 }

 function showUses(uses){
  find('uses').replaceChildren(...(uses.length?uses.map(use=>{
   const li=document.createElement('li'),link=document.createElement('a')
   link.textContent=use.title||use.slug||use.page
   link.href=use.kind==='post'?`/app/posts?id=${encodeURIComponent(use.page)}`:use.kind==='item'?'/app/collections':use.kind==='component'?'/app':`/app/canvas?page=${encodeURIComponent(use.slug||use.page)}`
   li.append(link);if(use.kind&&use.kind!=='page')li.append(` (${use.kind})`);return li
  }):[Object.assign(document.createElement('li'),{textContent:'Not used in this draft.'})]))
 }

 function details(){
  const asset=assetFor(selected);find('details').hidden=!asset;if(!asset)return
  const value=local(asset)
  form.elements.name.maxLength=asset.kind==='image'?200:120
  for(const name of fields){if(name==='decorative')form.elements[name].checked=value[name];else form.elements[name].value=value[name]}
  find('image-fields').hidden=asset.kind!=='image';form.elements.alt.disabled=asset.kind!=='image'||value.decorative
  find('file-info').textContent=asset.kind==='image'?`${asset.image.width} × ${asset.image.height} pixels · Image`:`${Math.ceil(asset.size/1024)} KiB · PDF`
  const page=find('page').value;find('page').replaceChildren(...revision.site.pages.filter(page=>!page.deleted).map(page=>new Option(page.title,page.id??page.slug)))
  if([...find('page').options].some(option=>option.value===page))find('page').value=page
  find('place').disabled=busy||!!conflict||!find('page').value
  find('delete-confirm').hidden=true;showUses(references(asset));controls()
 }

 function refresh(){
  if(!assetFor(selected))selected=assets()[0]?key(assets()[0].kind,assets()[0].id):''
  folders();renderGrid();details();controls()
 }

 function comparison(latest){
  const lines=[`Latest revision: ${latest.id}`,`Images: ${latest.site.media?.length??0} · PDFs: ${latest.site.libraryFiles?.length??0}`]
  for(const draft of drafts.values())if(draft.dirty){const asset=(draft.kind==='image'?latest.site.media:latest.site.libraryFiles)?.find(asset=>asset.id===draft.id);lines.push(`\n${draft.values.name}\nLatest: ${asset?JSON.stringify(metadata(asset)): 'File was removed'}\nYour changes: ${JSON.stringify(draft.values)}`)}
  return lines.join('\n')
 }

 async function request(operation){
  if(busy||conflict)return false
  busy=true;blocked=false;failed=null;controls();say('Saving draft…')
  const previous=revision.site,sent=operation.action==='update'?{...operation,...(drafts.get(key(operation.kind,operation.id))?.values??{})}:operation
  try{
   const {history,...payload}=sent
   const response=await fetch('/api/pane/library',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({base:revision.id,...payload})}),result=await response.json()
   if(response.status===409&&result.latest){conflict={latest:result.latest,operation};find('conflict').hidden=false;find('latest').textContent=comparison(result.latest);blocked=true;say('Your changes are kept. Review the latest revision before retrying.');return false}
   if(!response.ok){if(result.uses){showUses(result.uses);say(result.error??'This file is used by content. Remove its placements before deleting.');return false}throw Error(result.error??'The draft could not be saved.')}
   if(!result.id||!result.site)throw Error('The server did not return the saved revision.')
   revision=result
   if(operation.action==='restore'){
    if(operation.history==='undo'){undo.pop();redo.push(previous)}else{redo.pop();undo.push(previous)}
   }else{undo.push(previous);if(undo.length>20)undo.shift();redo.length=0}
   if(sent.action==='update'){
    const draft=drafts.get(key(sent.kind,sent.id));if(draft&&fields.every(name=>draft.values[name]===sent[name]))drafts.delete(key(sent.kind,sent.id))
   }
   // Keep active metadata controls mounted while a save finishes under the cursor.
   if(operation.action==='update'){folders();renderGrid();controls()}else refresh()
   say('Draft saved. Not published.');return true
  }catch(error){blocked=true;failed=operation;say(`${error.message} Your changes are kept here.`);return false}
  finally{busy=false;controls();if(!blocked&&!conflict&&dirty())timer=setTimeout(flush,500)}
 }

 async function flush(){
  clearTimeout(timer);if(busy||preparing||blocked||conflict)return false
  const draft=[...drafts.values()].find(draft=>draft.dirty)
  if(!draft)return true
  if(!draft.values.name.trim()){say('Enter a media name before saving.');return false}
  const saved=await request({action:'update',kind:draft.kind,id:draft.id,...draft.values})
  return saved?flush():false
 }

 async function act(operation){if(busy||conflict||preparing)return false;if(dirty()&&!await flush())return false;return request(operation)}

 grid.addEventListener('click',event=>{
  const button=event.target.closest('[data-library-item]');if(!button)return
  selected=key(button.dataset.kind,button.dataset.id);details();for(const item of grid.querySelectorAll('[data-library-item]'))item.setAttribute('aria-pressed',String(item===button))
 })
 for(const name of ['search','type','folder-filter'])find(name).addEventListener(name==='search'?'input':'change',renderGrid)
 form.addEventListener('input',()=>{
  const asset=assetFor(selected);if(!asset)return
  const value=values();if(value.decorative){value.alt='';form.elements.alt.value=''}form.elements.alt.disabled=value.decorative
  drafts.set(selected,{kind:asset.kind,id:asset.id,values:value,dirty:!same(value,metadata(asset))});blocked=false;failed=null
  say(conflict?'Your changes are kept. Review the latest revision before retrying.':'Changes waiting to save…');controls();clearTimeout(timer);timer=setTimeout(flush,500)
 })
 form.addEventListener('submit',event=>{event.preventDefault();blocked=false;flush()})
 find('retry').addEventListener('click',()=>{const operation=failed;blocked=false;if(operation?.action==='update')flush();else if(operation)act(operation)})
 find('place').addEventListener('click',()=>{const asset=assetFor(selected);if(asset&&find('page').value)act({action:'place',kind:asset.kind,id:asset.id,page:find('page').value})})
 find('delete').addEventListener('click',()=>{find('delete-confirm').hidden=false;find('delete-permanently').focus()})
 find('delete-cancel').addEventListener('click',()=>{find('delete-confirm').hidden=true;find('delete').focus()})
 find('delete-permanently').addEventListener('click',async()=>{const asset=assetFor(selected);if(asset&&await act({action:'delete',kind:asset.kind,id:asset.id}))refresh()})
 for(const direction of ['undo','redo'])find(direction).addEventListener('click',()=>{const stack=direction==='undo'?undo:redo;if(stack.length)act({action:'restore',site:stack.at(-1),history:direction})})
 find('latest-select').addEventListener('click',()=>{revision=conflict.latest;conflict=null;drafts.clear();undo.length=0;redo.length=0;blocked=false;failed=null;find('conflict').hidden=true;refresh();say('Latest revision selected. Local changes discarded.')})
 find('rebase').addEventListener('click',async()=>{
  const pending=conflict
  for(const [id,draft] of drafts){
   const original=assetFor(id),latest=(draft.kind==='image'?pending.latest.site.media:pending.latest.site.libraryFiles)?.find(asset=>asset.id===draft.id)
   if(original&&latest){const before=metadata(original),merged=metadata(latest);for(const name of fields)if(draft.values[name]!==before[name])merged[name]=draft.values[name];draft.values=merged;draft.dirty=!same(merged,metadata(latest))}
  }
  revision=pending.latest;conflict=null;blocked=false;find('conflict').hidden=true;details()
  // Undo snapshots were based on the earlier revision. A fresh history begins here.
  undo.length=0;redo.length=0
  if(pending.operation.action==='update')await flush();else await act(pending.operation)
 })
 find('upload').addEventListener('change',async event=>{
  const files=[...event.target.files];if(!files.length)return
  if(busy||conflict){event.target.value='';return}
  if(dirty()&&!await flush()){event.target.value='';return}
  preparing=true;controls();say(`Preparing ${files.length} files…`)
  try{
   const images=[],pdfs=[]
   for(const file of files){
    if(file.type==='application/pdf'){
     if(!file.size||file.size>512*1024)throw Error(`${file.name}: choose a PDF up to 512 KiB.`)
     const bytes=new Uint8Array(await file.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error(`${file.name}: this file is not a PDF.`)
     let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte)
     pdfs.push({id:crypto.randomUUID(),name:file.name,type:'application/pdf',size:file.size,data:btoa(binary)})
    }else images.push({id:crypto.randomUUID(),name:file.name,image:await readImage(file)})
   }
   preparing=false;const saved=await request({action:'upload',images,files:pdfs})
   if(saved){const first=images[0]??pdfs[0];selected=key(images.length?'image':'pdf',first.id);refresh()}
  }catch(error){say(`${error.message} No files from this upload were saved.`)}
  finally{preparing=false;event.target.value='';controls()}
 })
 addEventListener('beforeunload',event=>{if(dirty()||busy||preparing||conflict||failed){event.preventDefault();event.returnValue=''}})
 refresh()
}
