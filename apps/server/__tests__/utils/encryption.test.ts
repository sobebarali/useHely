import { describe, expect, it } from "vitest";
import {
	decrypt,
	encrypt,
	generateMasterKey,
} from "../../src/utils/encryption";

describe("Encryption Utilities", () => {
	describe("generateMasterKey", () => {
		it("generates a 256-bit key (64 hex characters)", () => {
			const key = generateMasterKey();
			expect(key).toHaveLength(64); // 32 bytes * 2 (hex encoding)
			expect(key).toMatch(/^[0-9a-f]{64}$/);
		});

		it("generates unique keys each time", () => {
			const key1 = generateMasterKey();
			const key2 = generateMasterKey();
			expect(key1).not.toBe(key2);
		});
	});

	describe("encrypt and decrypt", () => {
		const masterKey = generateMasterKey();

		it("encrypts and decrypts plaintext correctly", () => {
			const plaintext = "Hello, World!";
			const ciphertext = encrypt(plaintext, masterKey);
			const decrypted = decrypt(ciphertext, masterKey);

			expect(decrypted).toBe(plaintext);
		});

		it("produces different ciphertext for same plaintext (due to random IV)", () => {
			const plaintext = "Same text";
			const ciphertext1 = encrypt(plaintext, masterKey);
			const ciphertext2 = encrypt(plaintext, masterKey);

			expect(ciphertext1).not.toBe(ciphertext2);

			// But both decrypt to same plaintext
			expect(decrypt(ciphertext1, masterKey)).toBe(plaintext);
			expect(decrypt(ciphertext2, masterKey)).toBe(plaintext);
		});

		it("handles empty strings", () => {
			const plaintext = "";
			const ciphertext = encrypt(plaintext, masterKey);
			const decrypted = decrypt(ciphertext, masterKey);

			expect(decrypted).toBe("");
		});

		it("handles unicode characters", () => {
			const plaintext = "Hello 世界 🌍 Ñoño";
			const ciphertext = encrypt(plaintext, masterKey);
			const decrypted = decrypt(ciphertext, masterKey);

			expect(decrypted).toBe(plaintext);
		});

		it("handles long text", () => {
			const plaintext = "A".repeat(10000);
			const ciphertext = encrypt(plaintext, masterKey);
			const decrypted = decrypt(ciphertext, masterKey);

			expect(decrypted).toBe(plaintext);
		});

		it("throws error when decrypting with wrong key", () => {
			const plaintext = "Secret data";
			const ciphertext = encrypt(plaintext, masterKey);
			const wrongKey = generateMasterKey();

			expect(() => decrypt(ciphertext, wrongKey)).toThrow();
		});

		it("throws error when decrypting invalid ciphertext", () => {
			expect(() => decrypt("invalid-base64", masterKey)).toThrow();
			expect(() => decrypt("", masterKey)).toThrow();
		});

		it("produces base64-encoded ciphertext", () => {
			const plaintext = "Test";
			const ciphertext = encrypt(plaintext, masterKey);

			// Base64 pattern: alphanumeric + / + = (padding)
			expect(ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);

			// Should be decodable as base64
			expect(() => Buffer.from(ciphertext, "base64")).not.toThrow();
		});

		it("encrypts sensitive PII data correctly", () => {
			const patientData = {
				firstName: "John",
				lastName: "Doe",
				dateOfBirth: "1990-01-01",
				phone: "+1234567890",
				email: "john.doe@example.com",
			};

			const encryptedData: Record<string, string> = {};
			for (const [key, value] of Object.entries(patientData)) {
				encryptedData[key] = encrypt(value, masterKey);
			}

			// Verify all fields are encrypted
			for (const key of Object.keys(patientData)) {
				expect(encryptedData[key]).not.toBe(
					patientData[key as keyof typeof patientData],
				);
			}

			// Verify all fields can be decrypted
			for (const [key, value] of Object.entries(encryptedData)) {
				const decrypted = decrypt(value, masterKey);
				expect(decrypted).toBe(patientData[key as keyof typeof patientData]);
			}
		});

		it("ensures encrypted data is not readable", () => {
			const ssn = "123-45-6789";
			const encrypted = encrypt(ssn, masterKey);

			// Encrypted data should not contain the original
			expect(encrypted).not.toContain("123");
			expect(encrypted).not.toContain("6789");
			expect(encrypted).not.toContain(ssn);
		});
	});

	describe("encryption security properties", () => {
		it("uses AES-256-GCM (auth tag should be present)", () => {
			const masterKey = generateMasterKey();
			const plaintext = "Test";
			const ciphertext = encrypt(plaintext, masterKey);

			// Decode base64 to check structure
			const buffer = Buffer.from(ciphertext, "base64");

			// GCM format: IV (12 bytes) + encrypted data + auth tag (16 bytes)
			// Minimum length should be 12 (IV) + 16 (auth tag) = 28 bytes
			expect(buffer.length).toBeGreaterThanOrEqual(28);
		});

		it("uses different IV for each encryption", () => {
			const masterKey = generateMasterKey();
			const plaintext = "Same text";

			const ciphertext1 = encrypt(plaintext, masterKey);
			const ciphertext2 = encrypt(plaintext, masterKey);

			const buffer1 = Buffer.from(ciphertext1, "base64");
			const buffer2 = Buffer.from(ciphertext2, "base64");

			// Extract IV (first 12 bytes)
			const iv1 = buffer1.subarray(0, 12);
			const iv2 = buffer2.subarray(0, 12);

			expect(Buffer.compare(iv1, iv2)).not.toBe(0); // IVs should be different
		});

		it("tampered ciphertext fails to decrypt", () => {
			const masterKey = generateMasterKey();
			const plaintext = "Important data";
			const ciphertext = encrypt(plaintext, masterKey);

			// Tamper with the ciphertext
			const buffer = Buffer.from(ciphertext, "base64");
			const lastIndex = buffer.length - 1;
			const lastByte = buffer[lastIndex];
			if (lastByte !== undefined) {
				buffer[lastIndex] = lastByte ^ 1; // Flip one bit
			}
			const tamperedCiphertext = buffer.toString("base64");

			// Should throw due to authentication tag mismatch
			expect(() => decrypt(tamperedCiphertext, masterKey)).toThrow();
		});
	});
});
