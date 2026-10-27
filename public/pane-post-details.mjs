import './pane-blog-settings.mjs'
import {readImage} from './pane-image.mjs'
for(const picker of document.querySelectorAll('[data-post-featured]')){
 picker.addEventListener('change',async()=>{
  const form=picker.closest('form'),status=form.querySelector('[data-featured-status]')
  try{const image=await readImage(picker.files[0]);form.elements.featuredImage.value=JSON.stringify(image);status.textContent='Featured image prepared. Add its description and save the post.'}catch(error){status.textContent=error.message}
 })
}
