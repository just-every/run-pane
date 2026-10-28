document.querySelectorAll('[data-typed-form]').forEach(form=>{
 form.noValidate=true
 form.addEventListener('submit',event=>{
  let first
  for(const field of form.querySelectorAll('input:not([type=hidden]),select,textarea')){
   if(!field.id)continue
   const error=document.getElementById(field.id+'-error');if(!error)continue
   let message=field.validity.valueMissing?'Complete this required field.':field.validity.typeMismatch?'Enter a valid email address.':field.validity.badInput?'Enter a valid date.':''
   if(field.type==='tel'&&field.value&&!/^(?:\+?1)?[2-9]\d{2}[2-9]\d{6}$/.test(field.value.replace(/[ ()\-.]/g,'')))message='Enter a valid US phone number.'
   if(field.type==='file'&&field.files[0]){const file=field.files[0];if(file.size>5*1024*1024)message='Choose a file of 5 MB or smaller.';else if(file.type!=='application/pdf'||!file.name.toLowerCase().endsWith('.pdf'))message='Choose a PDF file.'}
   if(message&&field.dataset.errorMessage)message=field.dataset.errorMessage
   error.textContent=message;error.hidden=!message
   const descriptions=(field.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&id!==error.id)
   if(message){field.setAttribute('aria-invalid','true');descriptions.push(error.id);first??=field}else field.removeAttribute('aria-invalid')
   if(descriptions.length)field.setAttribute('aria-describedby',descriptions.join(' '));else field.removeAttribute('aria-describedby')
   error.setAttribute('role','alert')
  }
  if(first){event.preventDefault();first.focus()}
 },true)
})
document.querySelectorAll('[data-form-builder]').forEach(form=>{
 const list=form.querySelector('[data-fields]'),template=form.querySelector('template')
 function add(value={}){const node=template.content.firstElementChild.cloneNode(true);for(const [name,answer] of Object.entries(value)){const field=node.querySelector('[data-field="'+name+'"]');if(field){if(field.type==='checkbox')field.checked=answer;else field.value=Array.isArray(answer)?answer.join('\n'):answer}}const type=node.querySelector('[data-field=type]'),required=node.querySelector('[data-field=required]');function marketing(){const enabled=['email-consent','sms-consent'].includes(type.value);node.querySelector('[data-sms-settings]').hidden=type.value!=='sms-consent';node.querySelector('[data-marketing-help]').hidden=!enabled;required.disabled=enabled;if(enabled)required.checked=false}type.addEventListener('change',marketing);marketing();node.querySelector('[data-remove]').addEventListener('click',()=>node.remove());list.append(node)}
 JSON.parse(form.querySelector('[data-initial-fields]').textContent).forEach(add)
 form.querySelector('[data-add]').addEventListener('click',()=>add())
 form.addEventListener('submit',()=>{form.querySelector('[name=fields]').value=JSON.stringify([...list.children].map(node=>Object.fromEntries([...node.querySelectorAll('[data-field]')].map(field=>[field.dataset.field,field.type==='checkbox'?field.checked:field.dataset.field==='options'?field.value.split(/\r?\n/).filter(Boolean):field.value]))))})
})
