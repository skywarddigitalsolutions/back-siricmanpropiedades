import { encryptSecret, decryptSecret } from './crypto.util';

const KEY = 'a1'.repeat(32); // 64 caracteres hex (32 bytes)
const OTHER_KEY = 'b2'.repeat(32);

describe('crypto.util', () => {
  it('decrypts back to the original plaintext', () => {
    const encrypted = encryptSecret('MY-TOTP-SECRET', KEY);

    expect(encrypted).not.toBe('MY-TOTP-SECRET');
    expect(decryptSecret(encrypted, KEY)).toBe('MY-TOTP-SECRET');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const first = encryptSecret('MY-TOTP-SECRET', KEY);
    const second = encryptSecret('MY-TOTP-SECRET', KEY);

    expect(first).not.toBe(second);
  });

  it('fails to decrypt with the wrong key', () => {
    const encrypted = encryptSecret('MY-TOTP-SECRET', KEY);

    expect(() => decryptSecret(encrypted, OTHER_KEY)).toThrow();
  });

  it('fails to decrypt a tampered payload (auth tag mismatch)', () => {
    const encrypted = encryptSecret('MY-TOTP-SECRET', KEY);
    const [iv, authTag, data] = encrypted.split(':');
    const tampered = [iv, authTag, data.slice(0, -2) + '00'].join(':');

    expect(() => decryptSecret(tampered, KEY)).toThrow();
  });
});
