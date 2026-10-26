for(const gallery of document.querySelectorAll('[data-gallery]')){
 const items=[...gallery.querySelectorAll('figure')];let index=0,start
 const position=()=>{const label=gallery.querySelector('[data-gallery-position]');if(label)label.textContent=`Image ${index+1} of ${items.length}`}
 const move=direction=>{index=(index+direction+items.length)%items.length;if(gallery.dataset.gallery==='slideshow')items.forEach((item,i)=>item.hidden=i!==index);else items[index].scrollIntoView({block:'nearest',inline:'start',behavior:'instant'});position()}
 gallery.querySelector('[data-gallery-prev]')?.addEventListener('click',()=>move(-1));gallery.querySelector('[data-gallery-next]')?.addEventListener('click',()=>move(1))
 gallery.addEventListener('touchstart',event=>start=event.touches[0].clientX,{passive:true});gallery.addEventListener('touchend',event=>{if(start!==undefined&&Math.abs(event.changedTouches[0].clientX-start)>40)move(event.changedTouches[0].clientX<start?1:-1);start=undefined},{passive:true})
 gallery.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-gallery-open]');if(!trigger)return
  index=Number(trigger.dataset.galleryOpen)
  const dialog=document.createElement('dialog');dialog.className='gallery-lightbox';dialog.setAttribute('aria-label','Image lightbox');dialog.innerHTML='<button type="button" class="secondary" data-close>Close lightbox</button><img alt=""><p data-caption></p><div class="gallery-controls"><button type="button" class="secondary" data-prev>Previous image</button><span role="status"></span><button type="button" class="secondary" data-next>Next image</button></div>'
  const show=()=>{const source=items[index].querySelector('img'),image=dialog.querySelector('img');image.src=source.currentSrc||source.src;image.alt=source.alt;image.width=source.width;image.height=source.height;dialog.querySelector('[data-caption]').textContent=items[index].querySelector('figcaption')?.textContent??'';dialog.querySelector('[role=status]').textContent=`Image ${index+1} of ${items.length}`}
  const next=direction=>{index=(index+direction+items.length)%items.length;show()}
  dialog.querySelector('[data-prev]').onclick=()=>next(-1);dialog.querySelector('[data-next]').onclick=()=>next(1);dialog.querySelector('[data-close]').onclick=()=>dialog.close()
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();next(event.key==='ArrowRight'?1:-1)}if(event.key==='Tab'){const buttons=[...dialog.querySelectorAll('button')],at=buttons.indexOf(document.activeElement);if(event.shiftKey&&at===0){event.preventDefault();buttons.at(-1).focus()}else if(!event.shiftKey&&at===buttons.length-1){event.preventDefault();buttons[0].focus()}}})
  let touch;dialog.addEventListener('touchstart',e=>touch=e.touches[0].clientX,{passive:true});dialog.addEventListener('touchend',e=>{if(touch!==undefined&&Math.abs(e.changedTouches[0].clientX-touch)>40)next(e.changedTouches[0].clientX<touch?1:-1);touch=undefined},{passive:true})
  dialog.addEventListener('close',()=>{dialog.remove();trigger.focus()},{once:true});document.body.append(dialog);show();dialog.showModal()
 })
}
