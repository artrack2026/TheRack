import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const region = process.env.AWS_REGION
const bucket = process.env.AWS_S3_BUCKET

export const isS3Configured = !!(region && bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)

export function getS3Client() {
  if (!isS3Configured) throw new Error('AWS S3 is not configured. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.')
  return new S3Client({ region })
}

export function publicUrlForKey(key: string) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

/** Presigned PUT URL — the browser uploads the file directly to S3, the file
 *  never passes through a Vercel function (avoids body-size limits + bandwidth cost). */
export async function presignUpload(key: string, contentType: string) {
  const client = getS3Client()
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 })
  return { uploadUrl, publicUrl: publicUrlForKey(key) }
}

export async function deleteObject(key: string) {
  const client = getS3Client()
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

/** Extracts the S3 object key from one of our own public URLs — used so the
 *  product modal can delete an image by its stored URL alone. Returns null
 *  for anything that isn't one of our bucket's URLs (e.g. legacy/demo images). */
export function keyFromPublicUrl(url: string): string | null {
  const prefix = `https://${bucket}.s3.${region}.amazonaws.com/`
  return url.startsWith(prefix) ? url.slice(prefix.length) : null
}
