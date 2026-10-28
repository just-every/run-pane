// Save settings in place and serialize edits made while a request is pending.
for(const form of document.querySelectorAll('[data-comment-settings]')){
 const status=form.querySelector('[data-comment-save-status]')
 const values=()=>Object.fromEntries(new FormData(form))
 let saved=JSON.stringify(values()),timer,pending=false
 const dirty=()=>JSON.stringify(values())!==saved
 async function save(){
  clearTimeout(timer)
  if(pending||!dirty())return
  if(!form.checkValidity()){status.textContent='Complete the settings before they can be saved.';return}
  const body=values(),sent=JSON.stringify(body)
  pending=true;status.textContent='Saving…'
  let succeeded=false
  try{
   const response=await fetch('/api/pane/comments/settings',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:sent})
   const result=await response.json()
   if(!response.ok)throw Error(result.error??'Settings could not be saved. Your values are kept here.')
   saved=sent;succeeded=true;status.textContent=dirty()?'Unsaved changes.':'Saved'
  }catch(error){status.textContent=error.message||'Settings could not be saved. Your values are kept here.'}
  finally{pending=false;if(succeeded&&dirty())timer=setTimeout(save,600)}
 }
 function changed(){clearTimeout(timer);status.textContent=dirty()?'Unsaved changes.':'Saved';timer=setTimeout(save,600)}
 form.addEventListener('input',changed)
 form.addEventListener('change',changed)
 form.addEventListener('submit',event=>{event.preventDefault();save()})
 addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue=''}})
}
