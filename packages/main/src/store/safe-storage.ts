import { safeStorage } from 'electron'

// Wrap electron `safeStorage` with a sentinel prefix so encrypted values are
// distinguishable from legacy plaintext. When encryption is unavailable
// (Linux without libsecret) we fall back to a no-op passthrough — callers
// still get back the value they wrote, just unencrypted on disk.
const SENTINEL = 'enc:v1:'

export function isEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function encryptField(value: string): string {
  if (!value) return ''
  if (!isEncryptionAvailable()) return value
  const buf = safeStorage.encryptString(value)
  return SENTINEL + buf.toString('base64')
}

export function decryptField(stored: string): string {
  if (!stored) return ''
  if (!stored.startsWith(SENTINEL)) return stored
  if (!isEncryptionAvailable()) return stored.slice(SENTINEL.length)
  const buf = Buffer.from(stored.slice(SENTINEL.length), 'base64')
  try {
    return safeStorage.decryptString(buf)
  } catch {
    return ''
  }
}
