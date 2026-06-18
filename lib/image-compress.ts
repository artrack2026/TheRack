/** Resizes + re-encodes an image client-side before upload, so a multi-MB phone
 *  photo becomes a few hundred KB WebP file — keeps S3 storage/egress low without
 *  requiring the admin to manually optimize photos. */
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82,
): Promise<{ blob: Blob; contentType: string }> {
  const bitmap = await createImageBitmap(file)
  const scale  = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width  = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob) throw new Error('Image compression failed')
  return { blob, contentType: 'image/webp' }
}
