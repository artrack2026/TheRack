import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { presignUpload, deleteObject, keyFromPublicUrl, isS3Configured } from '@/lib/s3'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILENAME_LEN = 100

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-MAX_FILENAME_LEN)
}

/* POST /api/admin/media — request a presigned S3 upload URL for one product image.
   Body: { filename, contentType } */
export async function POST(req: NextRequest) {
  if (!isS3Configured) return NextResponse.json({ error: 'S3 is not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { filename, contentType } = await req.json()
  if (!filename || !contentType) {
    return NextResponse.json({ error: 'filename and contentType are required' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images are allowed' }, { status: 400 })
  }

  const key = `products/${crypto.randomUUID()}-${sanitizeFilename(filename)}`
  const { uploadUrl, publicUrl } = await presignUpload(key, contentType)

  return NextResponse.json({ uploadUrl, publicUrl })
}

/* DELETE /api/admin/media — remove a product image from S3 by its public URL.
   Body: { url } */
export async function DELETE(req: NextRequest) {
  if (!isS3Configured) return NextResponse.json({ error: 'S3 is not configured' }, { status: 503 })

  const check = await requireAdmin()
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { url } = await req.json()
  const key = url ? keyFromPublicUrl(url) : null
  if (!key) return NextResponse.json({ ok: true }) // not one of our S3 URLs — nothing to delete

  await deleteObject(key)
  return NextResponse.json({ ok: true })
}
