import {readImage} from './pane-image.mjs'
export function galleryEditor(form,{block,section,commit,newBlock}){
 const mediaField=form.querySelector('[data-media-state]');let media=JSON.parse(mediaField.value),selected=0
 const panel=form.querySelector('[data-gallery-settings]'),itemSelect=panel.querySelector('[data-gallery-item]'),library=panel.querySelector('[data-gallery-library]'),status=panel.querySelector('[data-gallery-status]')
 const save=()=>{mediaField.value=JSON.stringify(media);mediaField.dispatchEvent(new Event('input',{bubbles:true}));commit()}
 const asset=()=>media.find(asset=>asset.id===block()?.gallery?.items[selected]?.asset)
 const refresh=()=>{
  const g=block()?.gallery;panel.hidden=!g;if(!g)return
  selected=Math.min(selected,g.items.length-1)
  for(const input of panel.querySelectorAll('[data-gallery-field]')){const value=g[input.dataset.galleryField];if(input.type==='checkbox')input.checked=value;else input.value=value}
  itemSelect.replaceChildren(...g.items.map((item,i)=>new Option(`${i+1}. ${media.find(a=>a.id===item.asset)?.name??'Image'}`,i)));itemSelect.value=selected
  library.replaceChildren(...media.map(asset=>new Option(asset.name,asset.id)))
  panel.querySelector('[data-gallery-alt]').value=asset()?.image.alt??'';panel.querySelector('[data-gallery-caption]').value=g.items[selected]?.caption??'';panel.querySelector('[data-gallery-link]').value=g.items[selected]?.href??''
 }
 form.querySelector('[data-add-gallery]').onclick=()=>{const first=media[0];if(!first){status.textContent='Upload gallery images to start.';panel.hidden=false;return}const added={...newBlock(),kind:'gallery',text:'',gallery:{layout:'grid',columns:3,phoneColumns:1,gap:16,phoneGap:12,lightbox:true,items:[{asset:first.id,caption:''}]},row:Math.max(...section().blocks.map(item=>item.row))+1};section().blocks.push(added);commit(added.id)}
 panel.querySelector('[data-gallery-upload]').onchange=async event=>{
  try{
   const files=[...event.target.files];if(media.length+files.length>100)throw Error('The library holds up to 100 images.')
   status.textContent='Preparing gallery images…'
   const added=[];for(const file of files)added.push({id:crypto.randomUUID(),name:file.name,image:await readImage(file)})
   media.push(...added)
   if(!block()?.gallery){const gallery={...newBlock(),kind:'gallery',text:'',gallery:{layout:'grid',columns:3,phoneColumns:1,gap:16,phoneGap:12,lightbox:true,items:added.map(a=>({asset:a.id,caption:''}))},row:Math.max(...section().blocks.map(item=>item.row))+1};section().blocks.push(gallery);mediaField.value=JSON.stringify(media);commit(gallery.id)}
   else{block().gallery.items.push(...added.map(a=>({asset:a.id,caption:''})));save()}
   status.textContent=`${added.length} images added. Add descriptions before publishing.`
  }catch(error){status.textContent=error.message}event.target.value=''
 }
 itemSelect.onchange=()=>{selected=Number(itemSelect.value);refresh()}
 for(const input of panel.querySelectorAll('[data-gallery-field]'))input.oninput=()=>{if(!block()?.gallery||!input.checkValidity())return;block().gallery[input.dataset.galleryField]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;save()}
 for(const key of ['alt','caption','link'])panel.querySelector('[data-gallery-'+key+']').oninput=event=>{const item=block()?.gallery?.items[selected];if(!item)return;if(key==='alt'){asset().image.alt=event.target.value;asset().image.decorative=false}else if(key==='link'){if(event.target.value)item.href=event.target.value;else delete item.href}else item.caption=event.target.value;save()}
 panel.querySelector('[data-gallery-remove]').onclick=()=>{if(block()?.gallery.items.length>1){block().gallery.items.splice(selected,1);save()}}
 panel.querySelector('[data-gallery-add]').onclick=()=>{if(block()?.gallery&&library.value){block().gallery.items.push({asset:library.value,caption:''});save()}}
 form.addEventListener('draftrestore',()=>{media=JSON.parse(mediaField.value);refresh()})
 return {refresh,media:()=>media}
}
