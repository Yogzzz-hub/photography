import { describe, it, expect } from 'vitest';
import {
  generateMasterVaultKey,
  generateAlbumKey,
  deriveKeyEncryptionKey,
  encryptBinaryData,
  decryptBinaryData,
  encryptJsonMetadata,
  decryptJsonMetadata,
  wrapAlbumKey,
  unwrapAlbumKey,
  calculateSha256,
  exportKeyToHex,
  importKeyFromHex,
  formatRecoveryCode,
  parseRecoveryCode,
} from '../crypto/vaultCrypto';

describe('Vault Cryptographic Engine (E2EE)', () => {
  it('generates random keys and encrypts/decrypts binary data round-trip', async () => {
    const key = await generateMasterVaultKey();
    const testData = new TextEncoder().encode('Hello MyOrb Family Vault Secret Memory Pixels!');

    const { ciphertext, ivHex } = await encryptBinaryData(testData, key);
    expect(ciphertext.byteLength).toBeGreaterThan(0);
    expect(ivHex).toHaveLength(24); // 12 bytes = 24 hex characters

    const decrypted = await decryptBinaryData(ciphertext, key, ivHex);
    const decodedText = new TextDecoder().decode(decrypted);
    expect(decodedText).toBe('Hello MyOrb Family Vault Secret Memory Pixels!');
  });

  it('encrypts and decrypts structured JSON metadata round-trip', async () => {
    const albumKey = await generateAlbumKey();
    const metadata = {
      title: 'Grandma’s 80th Jubilee Celebration',
      story: 'A wonderful sunny afternoon by the garden lake.',
      captureDate: '2024-06-15',
      location: {
        latitude: 45.4215,
        longitude: -75.6972,
        label: 'Ottawa Garden Pavilion',
      },
      tags: ['family', 'milestone', 'summer'],
    };

    const { ciphertextHex, ivHex } = await encryptJsonMetadata(metadata, albumKey);
    expect(typeof ciphertextHex).toBe('string');
    expect(ciphertextHex.length).toBeGreaterThan(50);

    const decrypted = await decryptJsonMetadata(ciphertextHex, albumKey, ivHex);
    expect(decrypted).toEqual(metadata);
  });

  it('wraps and unwraps album keys with master key correctly', async () => {
    const masterKey = await generateMasterVaultKey();
    const albumKey = await generateAlbumKey();

    const { wrappedKeyHex, ivHex } = await wrapAlbumKey(albumKey, masterKey);
    const unwrappedAlbumKey = await unwrapAlbumKey(wrappedKeyHex, ivHex, masterKey);

    // Verify unwrapped key works by encrypting and decrypting with it
    const testMessage = new TextEncoder().encode('Key wrapping verified');
    const encrypted = await encryptBinaryData(testMessage, unwrappedAlbumKey);
    const decrypted = await decryptBinaryData(encrypted.ciphertext, albumKey, encrypted.ivHex);
    expect(new TextDecoder().decode(decrypted)).toBe('Key wrapping verified');
  });

  it('calculates reproducible SHA-256 hashes', async () => {
    const data = new TextEncoder().encode('MyOrb Photo Checksum Test');
    const hash1 = await calculateSha256(data);
    const hash2 = await calculateSha256(data);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('exports and restores recovery codes accurately', async () => {
    const key = await generateMasterVaultKey();
    const hex = await exportKeyToHex(key);
    expect(hex).toHaveLength(64); // 256 bits = 32 bytes = 64 hex chars

    const formatted = formatRecoveryCode(hex);
    expect(formatted.includes('-')).toBe(true);

    const parsed = parseRecoveryCode(formatted);
    expect(parsed).toBe(hex.toLowerCase());

    const restoredKey = await importKeyFromHex(parsed);
    expect(restoredKey).toBeDefined();

    // Verify functional equality of restored key
    const testPayload = new TextEncoder().encode('Restored key integrity check');
    const encrypted = await encryptBinaryData(testPayload, key);
    const decrypted = await decryptBinaryData(encrypted.ciphertext, restoredKey, encrypted.ivHex);
    expect(new TextDecoder().decode(decrypted)).toBe('Restored key integrity check');
  });

  it('derives KEK deterministically from passphrase and salt', async () => {
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const kek1 = await deriveKeyEncryptionKey('super-secret-family-passphrase', salt, 1000);
    const kek2 = await deriveKeyEncryptionKey('super-secret-family-passphrase', salt, 1000);

    const data = new TextEncoder().encode('Deterministic derivation');
    const enc = await encryptBinaryData(data, kek1);
    const dec = await decryptBinaryData(enc.ciphertext, kek2, enc.ivHex);
    expect(new TextDecoder().decode(dec)).toBe('Deterministic derivation');
  });
});
