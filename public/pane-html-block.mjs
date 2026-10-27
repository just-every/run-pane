// Each block starts off. Consent belongs only to this block in this document.
for(const block of document.querySelectorAll('[data-html-block]')){
 const slot=block.querySelector('[data-html-frame]'),status=block.querySelector('[data-html-status]')
 const allow=block.querySelector('[data-html-allow]'),deny=block.querySelector('[data-html-deny]')
 const quiet=()=>block.dataset.htmlQuiet==='1'||navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||navigator.doNotTrack==='yes'||window.doNotTrack==='1'
 function off(){
  slot.replaceChildren()
  allow.disabled=quiet()
  status.textContent=quiet()?'Your privacy choice keeps HTML code off.':'HTML code is off.'
 }
 allow.disabled=quiet()
 if(quiet())status.textContent='Your privacy choice keeps HTML code off.'
 allow.addEventListener('click',()=>{
  if(quiet()){off();return}
  if(slot.firstChild)return
  const frame=document.createElement('iframe')
  frame.title=block.dataset.htmlTitle
  frame.setAttribute('sandbox','allow-scripts')
  frame.referrerPolicy='no-referrer'
  frame.srcdoc=block.dataset.htmlSource
  slot.append(frame)
  allow.disabled=true
  status.textContent='HTML code is on. You can turn it off below.'
 })
 deny.addEventListener('click',off)
 // Recheck privacy signals when the viewer returns; never enable automatically.
 addEventListener('pageshow',()=>{if(quiet())off()})
 document.addEventListener('visibilitychange',()=>{if(quiet())off()})
}
