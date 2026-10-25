/** Decode only a user-selected local raster, then re-encode its actual pixels. */
export async function readImage(file) {
 if (!(file instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('Choose a PNG, JPEG or WebP image.')
 if (!file.size || file.size > 5 * 1024 * 1024) throw Error('Choose an image no larger than 5 MiB.')
 const url = URL.createObjectURL(file)
 try {
  const image = new Image()
  image.src = url
  try { await image.decode() } catch { throw Error('This image could not be decoded. Choose a valid PNG, JPEG or WebP image.') }
  if (!image.naturalWidth || !image.naturalHeight) throw Error('Choose an image with visible dimensions.')
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale)), height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw Error('The browser could not prepare this image. Try a browser with canvas support.')
  context.drawImage(image, 0, 0, width, height)
  const src = canvas.toDataURL('image/png')
  if (!src.startsWith('data:image/png;base64,')) throw Error('The browser could not encode this image as PNG.')
  const encoded = src.slice('data:image/png;base64,'.length)
  const size = encoded.length * 3 / 4 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)
  if (size > 256 * 1024) throw Error('The prepared image exceeds 256 KiB. Choose a smaller or simpler image, or resize it before uploading.')
  return { src, width, height, decorative: false }
 } finally {
  URL.revokeObjectURL(url)
 }
}
