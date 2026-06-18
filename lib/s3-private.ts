import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/* ── Private bucket — receipts, invoices, transaction records ──────────────
   Deliberately separate bucket AND separate IAM credentials from lib/s3.ts
   (product images): that bucket is public-read by design, this one must
   never be. Every read/write here goes through a short-lived signed URL —
   there is no public bucket policy backing this, so callers MUST verify the
   requester owns the record (or is admin) before calling these.

   Not wired into any route yet — this is the connection/signing plumbing
   for when checkout/receipts ship. ─────────────────────────────────────── */

const region = process.env.AWS_PRIVATE_REGION
const bucket = process.env.AWS_PRIVATE_S3_BUCKET
const accessKeyId     = process.env.AWS_PRIVATE_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_PRIVATE_SECRET_ACCESS_KEY

export const isPrivateS3Configured = !!(region && bucket && accessKeyId && secretAccessKey)

function getPrivateS3Client() {
  if (!isPrivateS3Configured) {
    throw new Error('AWS private S3 is not configured. Set AWS_PRIVATE_REGION, AWS_PRIVATE_S3_BUCKET, AWS_PRIVATE_ACCESS_KEY_ID, AWS_PRIVATE_SECRET_ACCESS_KEY.')
  }
  return new S3Client({ region, credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! } })
}

/** Presigned PUT URL for storing a receipt/invoice. Generate the key server-side
 *  (e.g. `receipts/${orderId}/${uuid}.pdf`) so it's tied to a real order. */
export async function presignPrivateUpload(key: string, contentType: string) {
  const client  = getPrivateS3Client()
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType })
  return getSignedUrl(client, command, { expiresIn: 300 })
}

/** Presigned GET URL — the only way to read a private object. Caller must
 *  confirm the requester owns the underlying record (or is admin) first. */
export async function presignPrivateDownload(key: string) {
  const client  = getPrivateS3Client()
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(client, command, { expiresIn: 300 })
}

export async function deletePrivateObject(key: string) {
  const client = getPrivateS3Client()
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}
