import {readImage} from './pane-image.mjs'
const editor=document.querySelector('[data-collections-editor]')
if(editor){
 const dirty=new Set(),pending=new Map(),schema=editor.querySelector('[data-collection-schema]'),itemForm=editor.querySelector('[data-collection-item-form]')
 const status=form=>form.querySelector('[data-collection-status]')
 const snapshot=form=>JSON.stringify([...new FormData(form)])
 const changed=form=>{dirty.add(form);status(form).textContent='Unsaved changes.'}
 const itemUrl=(collection,id)=>'/app/collections?collection='+encodeURIComponent(collection)+'&item='+encodeURIComponent(id)
 function updateBases(revision){for(const field of editor.querySelectorAll('input[name="base"]'))field.value=revision.id}
 async function save(form){
  if(pending.has(form))return pending.get(form)
  if(!form.reportValidity())return false
  const sent=snapshot(form),body=new FormData(form)
  status(form).textContent='Saving…'
  const request=(async()=>{
   try{
    const response=await fetch(form.action,{method:'POST',headers:{Accept:'application/json'},body}),result=await response.json()
    if(!response.ok)throw Error(result.error??'The draft could not be saved.')
    const unchanged=snapshot(form)===sent
    updateBases(result)
    if(unchanged)dirty.delete(form)
    status(form).textContent=unchanged?'Draft saved. Not published.':'Draft saved. You have unsaved changes.'
    if(form===schema&&unchanged){location.href='/app/collections?collection='+encodeURIComponent(form.elements.id.value);return true}
    if(form===itemForm){
     const collection=result.site.collections.find(collection=>collection.id===form.elements.collection.value),item=collection.items.find(item=>item.id===form.elements.id.value),list=editor.querySelector('[data-collection-item-list]')
     let row=[...list.children].find(row=>row.dataset.collectionItem===item.id)
     if(!row){row=document.createElement('li');row.dataset.collectionItem=item.id;row.append(document.createElement('a'));list.append(row)}
     row.firstElementChild.href=itemUrl(collection.id,item.id);row.firstElementChild.textContent=item.title
     editor.querySelector('[data-collection-empty]')?.remove()
     for(const link of form.querySelectorAll('[data-item-canvas]'))link.hidden=false
     for(const note of form.querySelectorAll('[data-save-before-canvas]'))note.hidden=true
    }
    return unchanged
   }catch(error){status(form).textContent=(error.message||'The draft could not be saved.')+' Your values are kept here.';return false}
   finally{pending.delete(form)}
  })()
  pending.set(form,request);return request
 }
 function fieldOptions(row){
  const type=row.querySelector('[data-field-key="type"]').value
  for(const [selector,active] of [['[data-option-settings]',type==='option'],['[data-reference-settings]',type==='reference']]){
   const panel=row.querySelector(selector);panel.hidden=!active
   for(const input of panel.querySelectorAll('select,textarea')){input.disabled=!active;input.required=active}
  }
 }
 function readFields(){
  const fields=[...schema.querySelectorAll('[data-schema-fields] [data-schema-field]')].map(row=>{
   const value={id:row.querySelector('[data-field-id]').value}
   for(const input of row.querySelectorAll('[data-field-key]'))value[input.dataset.fieldKey]=input.type==='checkbox'?input.checked:input.value
   if(!value.help)delete value.help
   if(value.type==='option')value.options=row.querySelector('[data-field-options]').value.split('\n').map(value=>value.trim()).filter(Boolean)
   if(value.type==='reference')value.reference=row.querySelector('[data-field-reference]').value
   row.querySelector('[data-field-heading]').textContent=value.label||'New field';return value
  })
  schema.querySelector('[data-schema-state]').value=JSON.stringify(fields);changed(schema)
 }
 schema?.addEventListener('input',event=>{const row=event.target.closest('[data-schema-field]');if(row)fieldOptions(row);readFields()})
 schema?.addEventListener('change',event=>{if(event.target.closest('[data-schema-field]')){fieldOptions(event.target.closest('[data-schema-field]'));readFields()}})
 schema?.addEventListener('click',event=>{
  if(event.target.closest('[data-add-field]')){
   const row=schema.querySelector('[data-schema-template]').content.firstElementChild.cloneNode(true)
   row.querySelector('[data-field-id]').value=crypto.randomUUID();schema.querySelector('[data-schema-fields]').append(row);readFields();row.querySelector('[data-field-key="label"]').focus()
  }
  const control=event.target.closest('[data-field-action]');if(!control)return
  const row=control.closest('[data-schema-field]'),action=control.dataset.fieldAction
  if(action==='remove')row.remove()
  if(action==='earlier'&&row.previousElementSibling)row.previousElementSibling.before(row)
  if(action==='later'&&row.nextElementSibling)row.nextElementSibling.after(row)
  readFields()
 })
 if(itemForm){
  const valueField=itemForm.querySelector('[data-item-values]'),values=JSON.parse(valueField.value),preparing=new Set()
  const record=()=>{valueField.value=JSON.stringify(values);changed(itemForm)}
  for(const input of itemForm.querySelectorAll('[data-item-value]'))input.addEventListener('input',()=>{
   const id=input.dataset.itemValue,type=input.dataset.itemType
   if(type==='richText'){
    if(!input.readOnly){if(input.value.trim())values[id]={body:input.value};else delete values[id]}
   }else if(type!=='text'&&input.value==='')delete values[id]
   else values[id]=['number','price'].includes(type)?Number(input.value):input.value
   record()
  })
  for(const panel of itemForm.querySelectorAll('[data-item-image]')){
   const id=panel.dataset.itemImage,picker=panel.querySelector('[data-collection-image]'),alt=panel.querySelector('[data-collection-image-alt]'),decorative=panel.querySelector('[data-collection-image-decorative]'),preview=panel.querySelector('[data-image-preview]'),note=panel.querySelector('[data-collection-image-status]')
   let generation=0
   picker.addEventListener('change',async()=>{
    if(!picker.files?.[0])return
    const version=++generation;preparing.add(id);note.textContent='Preparing image…'
    try{
     const image=await readImage(picker.files[0]);if(version!==generation)return;image.decorative=decorative.checked;image.alt=decorative.checked?'':alt.value;values[id]=image;picker.required=false
     const node=document.createElement('img');node.src=image.src;node.alt=image.alt;node.width=240;node.height=Math.max(1,Math.round(image.height*240/image.width));preview.replaceChildren(node);preview.hidden=false;record();note.textContent='Image prepared.'
    }catch(error){if(version===generation){note.textContent=error.message;picker.value=''}}finally{if(version===generation)preparing.delete(id)}
   })
   for(const input of [alt,decorative])input.addEventListener('input',()=>{
    alt.disabled=decorative.checked
    if(values[id]){values[id].decorative=decorative.checked;values[id].alt=decorative.checked?'':alt.value;const image=preview.querySelector('img');if(image)image.alt=values[id].alt;record()}
   })
   panel.querySelector('[data-collection-image-remove]').addEventListener('click',()=>{generation++;preparing.delete(id);delete values[id];picker.value='';picker.required=picker.dataset.imageRequired==='1';preview.replaceChildren();preview.hidden=true;record();note.textContent='Image removed from this draft.'})
  }
  itemForm.addEventListener('input',event=>{if(['title','slug'].includes(event.target.name))changed(itemForm)})
  itemForm.addEventListener('submit',event=>{event.preventDefault();if(preparing.size){status(itemForm).textContent='Wait for the image to finish preparing.';return}save(itemForm)})
  itemForm.addEventListener('click',async event=>{
   const link=event.target.closest('[data-item-canvas]');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
   if(!dirty.has(itemForm)&&!pending.has(itemForm))return
   event.preventDefault();if(preparing.size){status(itemForm).textContent='Wait for the image to finish preparing.';return}
   if(await save(itemForm))location.href=link.href
  })
 }
 schema?.addEventListener('submit',event=>{event.preventDefault();readFields();save(schema)})
 addEventListener('beforeunload',event=>{if(dirty.size){event.preventDefault();event.returnValue=''}})
}
