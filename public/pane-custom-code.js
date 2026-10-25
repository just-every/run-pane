// Only approved live revisions contain this loader. Code has an opaque origin and no network authority.
const region=document.querySelector('[data-custom-code]'),key='pane:consent:analytics'
const sent=new URLSearchParams(location.search).get('sent')
const sourcePage=sent==='1'?region.dataset.page:sent
let thanks=JSON.parse(region.dataset.thankGoals).filter(goal=>goal.page===sourcePage)
const quiet=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'
let frame,style
let verification=[]
function choose(choice,remember=false){
 if(remember){try{localStorage.setItem(key,choice)}catch{};dispatchEvent(new CustomEvent('pane:consent',{detail:{choice,source:'custom-code'}}))}
 if(choice==='allow'&&!quiet){
  if(!style&&region.dataset.css){style=document.createElement('style');style.textContent=region.dataset.css;document.head.append(style)}
  if(!verification.length)verification=JSON.parse(region.dataset.verifications).map(value=>{const meta=document.createElement('meta');meta.name=value.name;meta.content=value.content;document.head.append(meta);return meta})
  if(!frame){frame=document.createElement('iframe');frame.title='Owner custom content';frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.addEventListener('load',()=>{for(const goal of thanks)frame?.contentWindow.postMessage({type:'pane:goal',detail:{name:goal.name,value:goal.value}},'*');if(thanks.length){thanks=[];const url=new URL(location.href);url.searchParams.delete('sent');history.replaceState(history.state,'',url.pathname+url.search+url.hash)}});frame.srcdoc=region.dataset.source;region.querySelector('[data-code-frame]').append(frame)}
  region.querySelector('[data-code-status]').textContent='Custom code is on. You can turn it off below.'
 }else{
  frame?.remove();frame=undefined;style?.remove();style=undefined;verification.forEach(meta=>meta.remove());verification=[]
  region.querySelector('[data-code-status]').textContent='Custom code is off.'
  for(const pair of document.cookie.split('; ')){
   const name=pair.split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue
   document.cookie=name+'=; Max-Age=0; path=/'
   const parts=location.hostname.split('.');for(let i=0;i<parts.length-1;i++)document.cookie=name+'=; Max-Age=0; path=/; domain=.'+parts.slice(i).join('.')
  }
 }
}
region.querySelector('[data-code-allow]').addEventListener('click',()=>choose('allow',true))
region.querySelector('[data-code-deny]').addEventListener('click',()=>choose('deny',true))
addEventListener('pane:consent',event=>{if(event.detail.source!=='custom-code')choose(event.detail.choice)})
addEventListener('storage',event=>{if(event.key===key)choose(event.newValue)})
addEventListener('pane:goal',event=>{if(frame&&!quiet&&!JSON.parse(document.querySelector('script[data-goals]')?.dataset.goals??'[]').some(goal=>goal.type==='form'&&goal.name===event.detail.name))frame.contentWindow.postMessage({type:'pane:goal',detail:{name:event.detail.name,value:event.detail.value??1}},'*')})
let saved;try{saved=localStorage.getItem(key)}catch{}
choose(saved)
