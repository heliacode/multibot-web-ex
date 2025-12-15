import { encrypt, decrypt } from '../../config/encryption.js';

describe('Encryption Service', () => {
  describe('encrypt', () => {
    it('should encrypt a string', () => {
      const plaintext = 'test-token-12345';
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':');
    });

    it('should produce different encrypted values for same input (due to IV)', () => {
      const plaintext = 'test-token';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string correctly', () => {
      const plaintext = 'test-token-12345';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle multiple encrypt/decrypt cycles', () => {
      const plaintext = 'access-token-secret';
      let encrypted = encrypt(plaintext);
      let decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
      
      // Encrypt again
      encrypted = encrypt(decrypted);
      decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encrypt and decrypt integration', () => {
    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'token!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });
});

