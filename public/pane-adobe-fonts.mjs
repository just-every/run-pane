export function initAdobeFonts(root,renderFonts){
 const settings=root.querySelector('[data-adobe-settings]'),form=root.closest('form')
 const field=settings.querySelector('[data-adobe-state]'),project=settings.querySelector('[data-adobe-project]'),families=settings.querySelector('[data-adobe-families]'),authorize=settings.querySelector('[data-adobe-authorize]')
 const connect=settings.querySelector('[data-adobe-connect]'),disconnect=settings.querySelector('[data-adobe-disconnect]'),status=settings.querySelector('[data-adobe-status]')
 const state=()=>JSON.parse(field.value)
 function reset(){
  const adobe=state()
  project.value=adobe?.project??'';families.value=adobe?.families.join(', ')??'';authorize.checked=false
  connect.textContent=adobe?'Update configuration':'Connect project';disconnect.disabled=!adobe
  project.removeAttribute('aria-invalid');families.removeAttribute('aria-invalid');authorize.removeAttribute('aria-invalid')
 }
 function invalid(control,message){control.setAttribute('aria-invalid','true');status.textContent=message;control.focus()}
 function apply(adobe){
  field.value=JSON.stringify(adobe)
  const available=new Set(adobe?.families.map(family=>'adobe:'+family)??[])
  for(const select of root.querySelectorAll('[data-font-choice]'))if(select.value.startsWith('adobe:')&&!available.has(select.value))select.value='figtree'
  reset();renderFonts();field.dispatchEvent(new Event('input',{bubbles:true}))
 }
 connect.addEventListener('click',()=>{
  project.removeAttribute('aria-invalid');families.removeAttribute('aria-invalid');authorize.removeAttribute('aria-invalid')
  const id=project.value.trim(),names=families.value.split(',').map(name=>name.trim()),unique=[...new Set(names)]
  if(!/^[a-z0-9]{7}$/.test(id)){invalid(project,'Enter the seven lowercase letters and numbers of your Adobe project ID.');return}
  if(names.some(name=>!/^[a-z][a-z0-9-]{0,79}$/i.test(name))||unique.length>12){invalid(families,'Enter 1 to 12 CSS font-family names, separated by commas. Use letters, numbers and hyphens, starting with a letter.');return}
  if(!authorize.checked){invalid(authorize,'Authorize your Adobe web project before connecting or updating it.');return}
  apply({project:id,families:unique,authorized:true})
  status.textContent='Adobe configuration added to draft. Choose its fonts for headings or body text. Review the preview before publishing.'
 })
 disconnect.addEventListener('click',()=>{
  apply(null);status.textContent='Adobe configuration removed from draft.';connect.focus()
 })
 form.addEventListener('draftrestore',()=>{
  reset();renderFonts();status.textContent=state()?'Adobe configuration restored in this draft. Review the preview before publishing.':'No Adobe project configured.'
 })
 form.addEventListener('panedraftsaved',event=>{
  if(JSON.stringify(event.detail.site.styles?.adobe??null)!==field.value)return
  status.textContent=state()?'Adobe configuration saved in this draft. Review the preview before publishing.':'No Adobe project configured.'
 })
 reset()
}
