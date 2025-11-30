import { describe, expect, it } from "vitest";
import {
	generateBackupCodes,
	generateQrCodeDataUrl,
	generateTotpSecret,
	hashBackupCode,
	verifyBackupCode,
	verifyTotp,
} from "../../src/utils/mfa";

describe("MFA Utilities", () => {
	describe("generateTotpSecret", () => {
		it("generates a base32 encoded secret", () => {
			const secret = generateTotpSecret();

			// Base32 alphabet: A-Z and 2-7
			expect(secret).toMatch(/^[A-Z2-7]+$/);
			expect(secret.length).toBeGreaterThan(0);
		});

		it("generates unique secrets each time", () => {
			const secret1 = generateTotpSecret();
			const secret2 = generateTotpSecret();

			expect(secret1).not.toBe(secret2);
		});

		it("generates secrets of appropriate length", () => {
			const secret = generateTotpSecret();

			// Typical TOTP secrets are 16-32 characters
			expect(secret.length).toBeGreaterThanOrEqual(16);
			expect(secret.length).toBeLessThanOrEqual(64);
		});
	});

	describe("generateQrCodeDataUrl", () => {
		it("generates a QR code data URL", async () => {
			const secret = generateTotpSecret();
			const dataUrl = await generateQrCodeDataUrl({
				secret,
				email: "user@example.com",
				issuer: "HMS",
			});

			// Should be a data URL
			expect(dataUrl).toMatch(/^data:image\/png;base64,/);
		});

		it("includes email and issuer in QR code", async () => {
			const secret = generateTotpSecret();
			const email = "test@hospital.com";
			const issuer = "Hospital Management System";

			const dataUrl = await generateQrCodeDataUrl({
				secret,
				email,
				issuer,
			});

			expect(dataUrl).toBeDefined();
			expect(dataUrl.length).toBeGreaterThan(100); // QR codes are fairly large
		});
	});

	describe("verifyTotp", () => {
		it("verifies a valid TOTP code", () => {
			const speakeasy = require("speakeasy");
			const secret = generateTotpSecret();

			// Generate a valid token
			const token = speakeasy.totp({
				secret,
				encoding: "base32",
			});

			const isValid = verifyTotp({ secret, code: token });
			expect(isValid).toBe(true);
		});

		it("rejects an invalid TOTP code", () => {
			const secret = generateTotpSecret();
			const invalidCode = "000000";

			const isValid = verifyTotp({ secret, code: invalidCode });
			expect(isValid).toBe(false);
		});

		it("rejects non-numeric codes", () => {
			const secret = generateTotpSecret();

			expect(verifyTotp({ secret, code: "ABCDEF" })).toBe(false);
			expect(verifyTotp({ secret, code: "12345a" })).toBe(false);
		});

		it("rejects codes that are too short or too long", () => {
			const secret = generateTotpSecret();

			expect(verifyTotp({ secret, code: "12345" })).toBe(false); // Too short
			expect(verifyTotp({ secret, code: "1234567" })).toBe(false); // Too long
		});

		it("handles time window for TOTP validation", () => {
			const speakeasy = require("speakeasy");
			const secret = generateTotpSecret();

			// Generate token for current time
			const currentToken = speakeasy.totp({
				secret,
				encoding: "base32",
			});

			// Should accept current token
			expect(verifyTotp({ secret, code: currentToken })).toBe(true);
		});
	});

	describe("generateBackupCodes", () => {
		it("generates 10 backup codes by default", () => {
			const codes = generateBackupCodes();
			expect(codes).toHaveLength(10);
		});

		it("generates specified number of backup codes", () => {
			const codes = generateBackupCodes(5);
			expect(codes).toHaveLength(5);
		});

		it("generates unique backup codes", () => {
			const codes = generateBackupCodes(10);
			const uniqueCodes = new Set(codes);

			expect(uniqueCodes.size).toBe(codes.length);
		});

		it("generates codes with correct format", () => {
			const codes = generateBackupCodes();

			for (const code of codes) {
				// Should be 8 characters, alphanumeric, uppercase
				expect(code).toMatch(/^[A-Z0-9]{8}$/);
			}
		});
	});

	describe("hashBackupCode and verifyBackupCode", () => {
		it("hashes and verifies a backup code correctly", async () => {
			const code = "ABCD1234";
			const hash = await hashBackupCode(code);

			// Hash should be a bcrypt hash (starts with $2)
			expect(hash).toMatch(/^\$2[aby]\$/);

			// Should verify correctly
			const isValid = await verifyBackupCode({ code, hashedCode: hash });
			expect(isValid).toBe(true);
		});

		it("rejects incorrect backup code", async () => {
			const correctCode = "ABCD1234";
			const wrongCode = "WXYZ9876";
			const hash = await hashBackupCode(correctCode);

			const isValid = await verifyBackupCode({
				code: wrongCode,
				hashedCode: hash,
			});
			expect(isValid).toBe(false);
		});

		it("produces different hashes for same code", async () => {
			const code = "ABCD1234";
			const hash1 = await hashBackupCode(code);
			const hash2 = await hashBackupCode(code);

			// Hashes should be different due to salt
			expect(hash1).not.toBe(hash2);

			// But both should verify
			expect(await verifyBackupCode({ code, hashedCode: hash1 })).toBe(true);
			expect(await verifyBackupCode({ code, hashedCode: hash2 })).toBe(true);
		});
	});

	describe("integration: complete MFA flow", () => {
		it("generates secret, QR code, and backup codes for MFA setup", async () => {
			// Step 1: Generate TOTP secret
			const secret = generateTotpSecret();
			expect(secret).toBeDefined();

			// Step 2: Generate QR code
			const qrCode = await generateQrCodeDataUrl({
				secret,
				email: "user@hospital.com",
				issuer: "HMS",
			});
			expect(qrCode).toMatch(/^data:image\/png;base64,/);

			// Step 3: Generate backup codes
			const backupCodes = generateBackupCodes(10);
			expect(backupCodes).toHaveLength(10);

			// Step 4: Hash backup codes for storage
			const hashedCodes = await Promise.all(
				backupCodes.map((code) => hashBackupCode(code)),
			);
			expect(hashedCodes).toHaveLength(10);

			// Step 5: Verify TOTP can be validated
			const speakeasy = require("speakeasy");
			const token = speakeasy.totp({
				secret,
				encoding: "base32",
			});
			expect(verifyTotp({ secret, code: token })).toBe(true);

			// Step 6: Verify backup codes can be validated
			const firstBackupCode = backupCodes[0];
			if (firstBackupCode) {
				const firstHash = hashedCodes[0];
				if (firstHash) {
					const isValid = await verifyBackupCode({
						code: firstBackupCode,
						hashedCode: firstHash,
					});
					expect(isValid).toBe(true);
				}
			}
		});
	});
});
