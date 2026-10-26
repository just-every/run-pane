import { readImage } from './pane-image.mjs'

for (const root of document.querySelectorAll('[data-brand-settings]')) {
 const field = root.querySelector('[data-brand-state]'), form = root.closest('form'), status = root.querySelector('[data-brand-status]')
 let brand = JSON.parse(field.value)
 const versions = {logo: 0, favicon: 0, social: 0}
 function preview(container, image, label, width) {
  container.replaceChildren()
  if (!image) return
  const node = document.createElement('img')
  node.src = image.src; node.alt = label
  const scale = Math.min(1, width / image.width, 140 / image.height)
  node.width = Math.max(1, Math.round(image.width * scale)); node.height = Math.max(1, Math.round(image.height * scale))
  container.append(node)
 }
 function render() {
  for (const key of ['logo', 'favicon', 'social']) {
   const container = root.querySelector(`[data-brand-preview="${key}"]`)
   preview(container, brand[key], `${key === 'social' ? 'Social image' : key === 'logo' ? 'Logo' : 'Favicon'} preview`, key === 'favicon' ? 48 : 180)
   if (!brand[key]) { const empty = document.createElement('p'); empty.textContent = 'No image selected.'; container.append(empty) }
   root.querySelector(`[data-brand-remove="${key}"]`).hidden = !brand[key]
  }
  preview(root.querySelector('[data-brand-card-image]'), brand.social, 'Social card image', 280)
 }
 function commit() {
  field.value = JSON.stringify(brand)
  render()
  field.dispatchEvent(new Event('input', {bubbles: true}))
 }
 for (const input of root.querySelectorAll('[data-brand-upload]')) input.addEventListener('change', async () => {
  const file = input.files?.[0], key = input.dataset.brandUpload
  if (!file) return
  const version = ++versions[key]
  input.disabled = true
  status.textContent = 'Preparing public brand image…'
  try {
   const image = await readImage(file)
   if (versions[key] !== version) return
   brand[key] = {src: image.src, width: image.width, height: image.height}
   commit()
   status.textContent = 'Public brand image prepared. Publish the draft to make it live.'
  } catch (error) {
   if (versions[key] === version) status.textContent = error instanceof Error ? error.message : 'The image could not be prepared.'
  } finally { input.value = ''; input.disabled = false }
 })
 for (const button of root.querySelectorAll('[data-brand-remove]')) button.addEventListener('click', () => {
  const key = button.dataset.brandRemove
  versions[key]++; delete brand[key]; commit()
  status.textContent = 'Brand image removed from this draft.'
 })
 form?.addEventListener('draftrestore', () => {
  for (const key of Object.keys(versions)) versions[key]++
  brand = JSON.parse(field.value); render(); status.textContent = ''
 })
 render()
}
