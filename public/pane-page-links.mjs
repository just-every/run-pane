for(const root of document.querySelectorAll('[data-page-link-picker]')){
 const button=root.querySelector('button'),label=root.querySelector('[data-page-link-label]'),target=root.querySelector('[data-page-link-target]'),field=root.closest('details').querySelector('textarea')
 button.addEventListener('click',()=>{
  if(!label.value.trim()||!target.value){label.focus();return}
  if(label.value.includes('|')){label.setCustomValidity('Choose a label without a vertical bar.');label.reportValidity();return}
  label.setCustomValidity('');field.value=[field.value.trim(),label.value.trim()+' | '+target.value].filter(Boolean).join('\n');field.dispatchEvent(new Event('input',{bubbles:true}));label.value=''
 })
 label.addEventListener('input',()=>label.setCustomValidity(''))
}
