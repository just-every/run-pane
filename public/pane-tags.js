// The live page owns consent; provider execution is confined to opaque frames.
const marketplace=document.querySelector('[data-marketplace]')
const quiet=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'
const active=new Map()
function choose(category,choice,remember=false){
 const key='pane:consent:tag:'+category
 if(remember){try{localStorage.setItem(key,choice)}catch{}}
 for(const template of marketplace.querySelectorAll('template')){
  if(template.dataset.category!==category)continue
  const provider=template.dataset.tagProvider
  if(choice==='allow'&&!quiet()){
   if(active.has(provider))continue
   const frame=document.createElement('iframe');frame.title=provider+' tag';frame.hidden=true;frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.srcdoc=template.dataset.source
   active.set(provider,frame);marketplace.append(frame)
  }else{active.get(provider)?.remove();active.delete(provider)}
 }
 marketplace.querySelector(`[data-tag-category="${category}"] [data-tag-status]`).textContent=choice==='allow'&&!quiet()?'This category is on. You can withdraw now.':'This category is off.'
}
for(const region of marketplace.querySelectorAll('[data-tag-category]')){
 const category=region.dataset.tagCategory
 for(const button of region.querySelectorAll('[data-tag-choice]'))button.addEventListener('click',()=>choose(category,button.dataset.tagChoice,true))
 let saved;try{saved=localStorage.getItem('pane:consent:tag:'+category)}catch{}
 choose(category,saved)
}
addEventListener('storage',event=>{const category=event.key?.replace('pane:consent:tag:','');if(marketplace.querySelector(`[data-tag-category="${category}"]`))choose(category,event.newValue)})
