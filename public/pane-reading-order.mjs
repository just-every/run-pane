/** Keep assistive reading order aligned with the active responsive grid. */
export function syncReadingOrder(root){
 for(const section of root.querySelectorAll('[data-section]')){
  const blocks=[...section.children].filter(node=>node.hasAttribute('data-block'))
  const ordered=[...blocks].sort((first,second)=>{
   const a=getComputedStyle(first),b=getComputedStyle(second)
   return Number(a.gridRowStart)-Number(b.gridRowStart)||Number(a.gridColumnStart)-Number(b.gridColumnStart)||Number(first.dataset.readingIndex)-Number(second.dataset.readingIndex)
  })
  // Preserve focused controls, audio playback and isolated frames while moving
  // blocks into the active grid order. Reattaching a frame resets its document.
  for(const [index,node] of ordered.entries())if(node!==blocks[index]){
   if(section.moveBefore)section.moveBefore(node,blocks[index])
   else section.insertBefore(node,blocks[index])
   blocks.splice(blocks.indexOf(node),1);blocks.splice(index,0,node)
  }
 }
}
for(const site of document.querySelectorAll('.public-site')){
 let width
 const observer=new ResizeObserver(entries=>{for(const entry of entries)if(entry.contentRect.width!==width){width=entry.contentRect.width;syncReadingOrder(site)}})
 observer.observe(site)
 syncReadingOrder(site)
}
