import { randomBytes } from 'crypto'

export function generateToken(): string {
  return 'mb_' + randomBytes(32).toString('hex')
}

export function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(8)
  let slug = ''
  for (let i = 0; i < bytes.length; i++) {
    slug += chars[bytes[i]! % chars.length]
  }
  return slug
}
