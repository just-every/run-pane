// The essential anti-spam provider is contacted only on an explicit Send action.
for (const form of document.querySelectorAll('form[data-turnstile-key]')) {
 const button=form.querySelector('button[type="submit"]'), status=form.querySelector('[data-verification-status]')
 let ready=false,loading=false
 form.addEventListener('submit',event=>{
  if(ready)return
  event.preventDefault()
  if(loading)return
  loading=true;button.disabled=true;status.textContent='Verifying your message…'
  const fail=()=>{loading=false;button.disabled=false;status.textContent='Verification failed. Your answers are kept; please try again.';slot.replaceChildren()}
  const slot=form.querySelector('[data-turnstile-slot]')
  const render=async()=>{try{const binding=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(form.dataset.form))),byte=>byte.toString(16).padStart(2,'0')).join('');window.turnstile.render(slot,{sitekey:form.dataset.turnstileKey,action:'pane-contact',cData:binding,callback:token=>{
   const input=document.createElement('input');input.type='hidden';input.name='cf-turnstile-response';input.value=token;form.append(input)
   ready=true;button.disabled=false;form.requestSubmit(button)
  },'error-callback':fail,'expired-callback':fail})}catch{fail()}}
  if(window.turnstile)render()
  else {const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.onload=render;script.onerror=fail;document.head.append(script)}
 })
}
