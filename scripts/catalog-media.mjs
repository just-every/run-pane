import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

export async function catalogMedia({page,saved}){
 const original=(await readFile('fixtures/images/apollo17.jpg')).toString('base64')
 const resized=await page.evaluate(async original=>{
  const image=new Image();image.src='data:image/jpeg;base64,'+original;await image.decode()
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=Math.round(256*image.naturalHeight/image.naturalWidth);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.75).split(',')[1]
 },original)
 const upload={name:'earth-print.jpg',mimeType:'image/jpeg',buffer:Buffer.from(resized,'base64')}
 await page.getByLabel('Add image file',{exact:true}).setInputFiles(upload);await page.locator('[data-layout-canvas] [data-image-block]').waitFor();await page.getByLabel('Alternative text',{exact:true}).fill('Earth photographed from Apollo 17');await page.getByLabel('Caption',{exact:true}).fill('A photograph for the studio print collection.');await saved()
 await page.getByRole('button',{name:'Add gallery',exact:true}).click();await page.getByLabel('Add gallery images',{exact:true}).setInputFiles(upload);await page.locator('[data-layout-canvas] [data-gallery] figure').waitFor();await page.getByLabel('Image description',{exact:true}).fill('Earth photographed from Apollo 17');await page.getByLabel('Image caption',{exact:true}).fill('Studio print collection');await page.getByLabel('Click to enlarge',{exact:true}).uncheck();await saved()
 await page.getByRole('button',{name:'Add quote',exact:true}).click();await page.locator('[data-quote-block] [data-block-text]').fill('Every piece deserves thoughtful care.');await page.getByLabel('Attribution',{exact:true}).fill('Cedar Street Studio');await saved()
 assert.equal(await page.locator('[data-layout-canvas] [data-block-type="image"]').count(),1);assert.equal(await page.locator('[data-layout-canvas] [data-block-type="gallery"]').count(),1);assert.equal(await page.locator('[data-layout-canvas] [data-block-type="quote"]').count(),1)
}
