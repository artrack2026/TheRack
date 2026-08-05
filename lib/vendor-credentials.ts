import crypto from 'crypto'
import { createSupabaseAdminClient } from '@/lib/supabase'

const ALGO = 'aes-256-gcm'

/** VENDOR_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key —
 *  generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *  This key itself still has to live in an env var; there's no way to encrypt
 *  secrets in the database without at least one root secret outside it. */
function getEncryptionKey(): Buffer {
  const b64 = process.env.VENDOR_CREDENTIALS_ENCRYPTION_KEY
  if (!b64) throw new Error('VENDOR_CREDENTIALS_ENCRYPTION_KEY is not configured.')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('VENDOR_CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes.')
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

/** Server-only — decrypts and returns a stored vendor credential (e.g. a
 *  Stripe secret key) for use at the exact moment of calling that vendor's
 *  API. Never pass the return value back to the browser in any response. */
export async function getVendorCredential(vendor: string, credentialKey: string): Promise<string | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('vendor_credentials')
    .select('encrypted_value')
    .eq('vendor', vendor)
    .eq('credential_key', credentialKey)
    .maybeSingle()
  if (!data?.encrypted_value) return null
  return decrypt(data.encrypted_value)
}

/** Encrypts and stores a vendor credential. Returns only the last 4
 *  characters for masked display — the plaintext and ciphertext never leave
 *  this function. */
export async function setVendorCredential(
  vendor: string,
  credentialKey: string,
  value: string,
  updatedBy: string
): Promise<string> {
  const admin = createSupabaseAdminClient()
  const encrypted_value = encrypt(value)
  const last_four = value.slice(-4)
  const { error } = await admin.from('vendor_credentials').upsert([{
    vendor,
    credential_key: credentialKey,
    encrypted_value,
    last_four,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  }])
  if (error) throw new Error(error.message)
  return last_four
}

export async function clearVendorCredential(vendor: string, credentialKey: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  await admin.from('vendor_credentials').delete().eq('vendor', vendor).eq('credential_key', credentialKey)
}

export interface VendorCredentialStatus {
  configured: boolean
  lastFour: string | null
  updatedAt: string | null
}

/** Status only — never includes the decrypted value or ciphertext. Safe to
 *  return directly from an API route to the admin browser. */
export async function listVendorCredentialStatus(): Promise<Record<string, VendorCredentialStatus>> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin.from('vendor_credentials').select('vendor, credential_key, last_four, updated_at')
  const map: Record<string, VendorCredentialStatus> = {}
  for (const row of data ?? []) {
    map[`${row.vendor}:${row.credential_key}`] = {
      configured: true,
      lastFour: row.last_four,
      updatedAt: row.updated_at,
    }
  }
  return map
}
