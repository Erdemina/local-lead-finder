import crypto from 'crypto'

// Platform API anahtarları (Google Places, LLM vb.) DB'de bu formatla saklanır:
// v1:<iv_b64>:<tag_b64>:<ciphertext_b64> — anahtar sadece sunucu tarafında çözülür.

function masterKey(): Buffer {
  const raw = process.env.SECRETS_MASTER_KEY
  if (!raw) {
    throw new Error(
      'SECRETS_MASTER_KEY tanımlı değil. 32 baytlık base64 anahtar üretin: openssl rand -base64 32'
    )
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('SECRETS_MASTER_KEY 32 baytlık base64 kodlu bir değer olmalı')
  }
  return key
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Bilinmeyen şifreli sır formatı')
  }
  const [, ivB64, tagB64, ctB64] = parts
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
