/** Keep assistive reading order aligned with the active responsive grid. */
export function syncReadingOrder(root){
 for(const section of root.querySelectorAll('[data-section]')){
  const blocks=[...section.children].filter(node=>node.hasAttribute('data-block'))
  const ordered=[...blocks].sort((first,second)=>{
   const a=getComputedStyle(first),b=getComputedStyle(second)
   return Number(a.gridRowStart)-Number(b.gridRowStart)||Number(a.gridColumnStart)-Number(b.gridColumnStart)||Number(first.dataset.readingIndex)-Number(second.dataset.readingIndex)
  })
  if(ordered.some((node,index)=>node!==blocks[index]))for(const node of ordered)section.append(node)
 }
}
for(const site of document.querySelectorAll('.public-site')){
 let width
 const observer=new ResizeObserver(entries=>{for(const entry of entries)if(entry.contentRect.width!==width){width=entry.contentRect.width;syncReadingOrder(site)}})
 observer.observe(site)
 syncReadingOrder(site)
}
