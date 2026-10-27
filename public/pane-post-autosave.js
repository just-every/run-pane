for(const form of document.querySelectorAll('form[data-post-editor]')){
 const fields=[...form.querySelectorAll('input[name]:not([type=hidden]),textarea[name]')],base=form.elements.base,status=form.querySelector('[data-save-status]'),conflict=form.querySelector('[data-conflict]'),undo=form.querySelector('[data-undo]'),redo=form.querySelector('[data-redo]')
 const state=()=>Object.fromEntries(fields.map(field=>[field.name,field.value])),signature=()=>JSON.stringify(state())
 let states=[state()],index=0,saved=signature(),timer,pending,blocked=false,failed=false,latest
 const buttons=()=>{undo.disabled=index===0;redo.disabled=index===states.length-1}
 function changed(record=true){if(record&&signature()!==JSON.stringify(states[index])){states=states.slice(0,index+1);states.push(state());index++}buttons();clearTimeout(timer);status.textContent=signature()===saved?'Draft saved. Not published.':'Unsaved changes.';if(!blocked&&signature()!==saved)timer=setTimeout(save,600)}
 function restore(value){for(const field of fields)field.value=value[field.name]??'';form.dispatchEvent(new Event('draftrestore'));changed(false)}
 async function save(){
  clearTimeout(timer)
  if(pending){await pending;if(!failed&&!blocked&&signature()!==saved)return save();return}
  if(blocked||signature()===saved)return
  if(!form.checkValidity()){status.textContent='Complete the required fields to save your draft.';return}
  const sent=signature();failed=false;status.textContent='Saving draft…'
  pending=(async()=>{try{
   const response=await fetch('/app/posts/save',{method:'POST',headers:{Accept:'application/json'},body:new FormData(form)}),result=await response.json()
   if(response.status===409){blocked=true;latest=result.latest;conflict.hidden=false;form.querySelector('[data-latest]').textContent=JSON.stringify(latest?.posts?.find(post=>post.id===form.elements.id.value)?.content??null,null,2);status.textContent='Compare the latest draft. Your work is retained.';return}
   if(!response.ok)throw Error(result.error??'The draft could not be saved.')
   base.value=result.base;saved=sent;status.textContent=signature()===saved?'Draft saved. Not published.':'Unsaved changes.'
  }catch(error){failed=true;status.textContent=error.message+' Your work is retained.'}finally{pending=null}})()
  await pending;if(!failed&&!blocked&&signature()!==saved)timer=setTimeout(save,600)
 }
 form.addEventListener('input',()=>changed());form.addEventListener('change',()=>changed())
 undo.addEventListener('click',()=>{if(index){index--;restore(states[index])}});redo.addEventListener('click',()=>{if(index<states.length-1){index++;restore(states[index])}})
 form.addEventListener('submit',event=>{event.preventDefault();save()})
 form.querySelector('[data-copy]').addEventListener('click',()=>{const link=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(state(),null,2)],{type:'application/json'}));link.href=url;link.download='my-post-draft.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)})
 form.querySelector('[data-merge]').addEventListener('click',()=>{if(!latest)return;base.value=latest.base;blocked=false;conflict.hidden=true;save()})
 form.querySelector('[data-load]').addEventListener('click',()=>{if(!latest)return;saved=signature();location.reload()})
 addEventListener('beforeunload',event=>{if(signature()!==saved){event.preventDefault();event.returnValue=''}});buttons()
}
