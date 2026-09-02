import crypto from 'crypto'

// AES-256-GCM encryption for user-supplied GitHub tokens at rest.
const SECRET = process.env.APP_SECRET || ''

export const encryptionAvailable = SECRET.length >= 16

function key(): Buffer {
  // Fail closed: never derive a key from a missing/weak secret
  if (!encryptionAvailable) throw new Error('APP_SECRET not configured')
  return crypto.scryptSync(SECRET, 'membox-github-pair', 32)
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()])
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join('.')
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted payload')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf-8')
}
