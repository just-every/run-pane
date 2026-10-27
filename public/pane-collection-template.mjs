export function bindCollectionTemplate(editor,{changed,save}){
 const form=editor.querySelector('[data-collection-template]')
 if(!form)return
 const enabled=form.querySelector('[data-template-enabled]'),controls=form.querySelector('[data-template-controls]'),state=form.querySelector('[data-template-value]'),list=form.querySelector('[data-template-fields]')
 let running=false,queued=false
 function record(){
  controls.disabled=!enabled.checked;state.disabled=!enabled.checked
  const fields=[...list.children].filter(row=>row.querySelector('[data-template-visible]').checked).map(row=>row.dataset.templateField),value={fields}
  for(const select of form.querySelectorAll('[data-template-binding]'))if(select.value)value[select.dataset.templateBinding]=select.value
  state.value=JSON.stringify(value)
  for(const row of list.children){row.querySelector('[data-template-move="earlier"]').disabled=!row.previousElementSibling;row.querySelector('[data-template-move="later"]').disabled=!row.nextElementSibling}
  changed(form)
 }
 async function persist(){
  queued=true
  if(running)return
  running=true
  try{while(queued){queued=false;await save(form)}}finally{running=false}
 }
 form.addEventListener('change',()=>{record();persist()})
 form.addEventListener('click',event=>{
  const button=event.target.closest('[data-template-move]');if(!button)return
  const row=button.closest('[data-template-field]')
  if(button.dataset.templateMove==='earlier'&&row.previousElementSibling)row.previousElementSibling.before(row)
  if(button.dataset.templateMove==='later'&&row.nextElementSibling)row.nextElementSibling.after(row)
  record();persist()
 })
 form.addEventListener('submit',event=>{event.preventDefault();record();persist()})
}
