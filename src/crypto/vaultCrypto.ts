/**
 * MyOrb Family Vault - Native Web Crypto End-to-End Encryption Engine
 * Zero external cryptographic dependencies.
 * Vetted primitives: AES-256-GCM, PBKDF2-SHA256, SHA-256, 96-bit unique nonces.
 */

// Utility: convert ArrayBuffer to Hex string
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Utility: convert Hex string to Uint8Array with standard ArrayBuffer
export function hexToBuffer(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match) return new Uint8Array(0);
  const buffer = new ArrayBuffer(match.length);
  const view = new Uint8Array(buffer);
  match.forEach((byte, i) => {
    view[i] = parseInt(byte, 16);
  });
  return view;
}

// Generate cryptographically secure random bytes
export function generateRandomBytes(length: number): Uint8Array {
  const buffer = new ArrayBuffer(length);
  const bytes = new Uint8Array(buffer);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Derives a 256-bit Key Encryption Key (KEK) from a user passphrase using PBKDF2 with SHA-256.
 */
export async function deriveKeyEncryptionKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = 600000
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Generate a new random 256-bit AES-GCM Master Vault Key (MVK).
 */
export async function generateMasterVaultKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Generate a separate 256-bit AES-GCM Album Encryption Key (AEK).
 */
export async function generateAlbumKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt arbitrary binary data (photo bytes, thumbnails) using AES-256-GCM with a unique 96-bit IV.
 */
export async function encryptBinaryData(
  data: ArrayBuffer | Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; ivHex: string }> {
  const iv = generateRandomBytes(12); // Standard 96-bit IV for AES-GCM
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data as BufferSource
  );

  return {
    ciphertext,
    ivHex: bufferToHex(iv),
  };
}

/**
 * Decrypt binary data (photo bytes, thumbnails) using AES-256-GCM.
 */
export async function decryptBinaryData(
  ciphertext: ArrayBuffer | Uint8Array,
  key: CryptoKey,
  ivHex: string
): Promise<ArrayBuffer> {
  const iv = hexToBuffer(ivHex);
  return window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );
}

/**
 * Encrypt a JSON object (metadata, story, location, notes).
 */
export async function encryptJsonMetadata(
  metadata: any,
  key: CryptoKey
): Promise<{ ciphertextHex: string; ivHex: string }> {
  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(JSON.stringify(metadata));
  const { ciphertext, ivHex } = await encryptBinaryData(plaintextBytes, key);

  return {
    ciphertextHex: bufferToHex(ciphertext),
    ivHex,
  };
}

/**
 * Decrypt a JSON object from encrypted ciphertext hex.
 */
export async function decryptJsonMetadata<T = any>(
  ciphertextHex: string,
  key: CryptoKey,
  ivHex: string
): Promise<T> {
  const cipherBytes = hexToBuffer(ciphertextHex);
  const decryptedBuffer = await decryptBinaryData(cipherBytes, key, ivHex);
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decryptedBuffer)) as T;
}

/**
 * Wraps (encrypts) an Album Key using the Master Vault Key for storage in DB.
 */
export async function wrapAlbumKey(
  albumKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrappedKeyHex: string; ivHex: string }> {
  const iv = generateRandomBytes(12);
  const wrapped = await window.crypto.subtle.wrapKey(
    'raw',
    albumKey,
    wrappingKey,
    { name: 'AES-GCM', iv: iv as BufferSource }
  );

  return {
    wrappedKeyHex: bufferToHex(wrapped),
    ivHex: bufferToHex(iv),
  };
}

/**
 * Unwraps (decrypts) a stored Album Key using the Master Vault Key.
 */
export async function unwrapAlbumKey(
  wrappedKeyHex: string,
  ivHex: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  const wrappedBytes = hexToBuffer(wrappedKeyHex);
  const iv = hexToBuffer(ivHex);

  return window.crypto.subtle.unwrapKey(
    'raw',
    wrappedBytes as BufferSource,
    wrappingKey,
    { name: 'AES-GCM', iv: iv as BufferSource },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Calculates SHA-256 hash of binary data for integrity verification and duplicate checking.
 */
export async function calculateSha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data as BufferSource);
  return bufferToHex(hashBuffer);
}

/**
 * Export raw key bytes as hex string (used for offline emergency recovery key generation).
 */
export async function exportKeyToHex(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return bufferToHex(raw);
}

/**
 * Import a 256-bit raw key from hex string (used for offline emergency recovery key restoration).
 */
export async function importKeyFromHex(hex: string): Promise<CryptoKey> {
  const bytes = hexToBuffer(hex);
  return window.crypto.subtle.importKey(
    'raw',
    bytes as BufferSource,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Generate formatted 256-bit Recovery Code (8 blocks of 8 hex chars with hyphens)
 */
export function formatRecoveryCode(hex: string): string {
  const clean = hex.toUpperCase().replace(/[^A-F0-9]/g, '');
  const chunks = clean.match(/.{1,4}/g) || [];
  return chunks.slice(0, 16).join('-');
}

export function parseRecoveryCode(formatted: string): string {
  return formatted.replace(/[^A-Fa-f0-9]/g, '').toLowerCase();
}
