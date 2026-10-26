const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function galleryMarkup(block,index,imageUrl,media=[]){
 const g=block.gallery
 return `<div data-block="${block.id}" data-reading-index="${index}" data-gallery="${g.layout}"><div class="gallery-items">${g.items.map((item,i)=>{
  const image=media.find(asset=>asset.id===item.asset)?.image;if(!image)return ''
  const url=width=>imageUrl?imageUrl(block.id+':'+item.asset,width):width===0?image.src:image.renditions.find(r=>r.width===width).src
  const img=`<img src="${escape(url(0))}"${image.renditions?.length?` srcset="${image.renditions.map(r=>escape(url(r.width))+' '+r.width+'w').join(', ')}" sizes="(max-width:700px) ${Math.ceil(100/g.phoneColumns)}vw, ${Math.ceil(1100/g.columns)}px"`:''} width="${image.width}" height="${image.height}" loading="lazy" decoding="async" alt="${escape(image.decorative?'':image.alt??'')}">`
  return `<figure data-gallery-index="${i}"${g.layout==='slideshow'&&i?' hidden':''}>${g.lightbox?`<button type="button" class="gallery-enlarge" data-gallery-open="${i}" data-tip="Open image" aria-label="Enlarge ${escape(image.alt||item.caption||'image '+(i+1))}">${img}</button>`:img}${item.caption?`<figcaption>${escape(item.caption)}</figcaption>`:''}${item.href?`<a href="${escape(item.href)}">${escape(item.caption||image.alt||'Image details')}</a>`:''}</figure>`
 }).join('')}</div>${['slideshow','carousel'].includes(g.layout)?'<div class="gallery-controls"><button type="button" data-gallery-prev>Previous image</button><span role="status" data-gallery-position>Image 1 of '+g.items.length+'</span><button type="button" data-gallery-next>Next image</button></div>':''}</div>`
}
