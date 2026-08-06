import crypto from 'crypto'
import { Secret, TOTP } from 'otpauth'
import QRCode from 'qrcode'

const ALGO = 'aes-256-gcm'
const ISSUER = 'ArtRAck'

/** TOTP_ENCRYPTION_KEY must be a base64-encoded 32-byte key, distinct from
 *  VENDOR_CREDENTIALS_ENCRYPTION_KEY — generate one with:
 *  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" */
function getEncryptionKey(): Buffer {
  const b64 = process.env.TOTP_ENCRYPTION_KEY
  if (!b64) throw new Error('TOTP_ENCRYPTION_KEY is not configured.')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('TOTP_ENCRYPTION_KEY must decode to exactly 32 bytes.')
  return key
}

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64')
}

function decrypt(packed: string): string {
  const buf = Buffer.from(packed, 'base64')
  const iv = buf.subarray(0, 12)
  const authTag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const decipher = crypto.createDecipheriv(ALGO, getEncryptionKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export interface TotpEnrollment {
  encryptedSecret: string
  base32Secret: string
  qrDataUrl: string
}

/** Starts enrollment: a brand-new random secret, ready to store as
 *  *pending* (profiles.totp_enabled stays false until verifyTotpCode
 *  confirms the app the user scanned/typed this into actually works). */
export async function generateTotpEnrollment(accountEmail: string): Promise<TotpEnrollment> {
  const secret = new Secret({ size: 20 })
  const totp = new TOTP({ issuer: ISSUER, label: accountEmail, secret })
  return {
    encryptedSecret: encrypt(secret.base32),
    base32Secret: secret.base32,
    qrDataUrl: await QRCode.toDataURL(totp.toString()),
  }
}

/** Verifies a submitted 6-digit code against an encrypted stored secret.
 *  window: 1 accepts the previous/next 30s step either side — standard
 *  clock-drift tolerance for authenticator apps. */
export function verifyTotpCode(encryptedSecret: string, code: string): boolean {
  const secret = Secret.fromBase32(decrypt(encryptedSecret))
  return TOTP.validate({ token: code.trim(), secret, window: 1 }) !== null
}
