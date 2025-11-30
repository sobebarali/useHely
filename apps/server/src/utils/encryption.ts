import {
	type Cipher,
	createCipheriv,
	createDecipheriv,
	type Decipher,
	randomBytes,
} from "node:crypto";

/**
 * Generate a 256-bit (32-byte) master encryption key
 * Returns a hex-encoded string (64 characters)
 *
 * Usage: Run this once to generate initial master key for .env
 * Example: ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)
 */
export function generateMasterKey(): string {
	return randomBytes(32).toString("hex");
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The text to encrypt
 * @param masterKey - 256-bit key as hex string (64 characters)
 * @returns Base64-encoded ciphertext with IV and auth tag
 *
 * Format: [IV (12 bytes)][encrypted data][auth tag (16 bytes)]
 *
 * Security features:
 * - AES-256-GCM provides both confidentiality and authenticity
 * - Random IV for each encryption (prevents pattern analysis)
 * - 16-byte authentication tag (prevents tampering)
 */
export function encrypt(plaintext: string, masterKey: string): string {
	// Convert hex key to buffer (32 bytes)
	const keyBuffer = Buffer.from(masterKey, "hex");

	if (keyBuffer.length !== 32) {
		throw new Error(
			"Invalid master key length. Expected 32 bytes (64 hex characters)",
		);
	}

	// Generate random 12-byte IV (recommended for GCM)
	const iv = randomBytes(12);

	// Create cipher
	const cipher: Cipher = createCipheriv("aes-256-gcm", keyBuffer, iv);

	// Encrypt the plaintext
	let encrypted = cipher.update(plaintext, "utf8", "base64");
	encrypted += cipher.final("base64");

	// Get the authentication tag (16 bytes)
	// Type assertion needed as some TS versions don't include getAuthTag in Cipher type
	const authTag = (cipher as Cipher & { getAuthTag(): Buffer }).getAuthTag();

	// Combine IV + encrypted data + auth tag
	const combined = Buffer.concat([
		iv,
		Buffer.from(encrypted, "base64"),
		authTag,
	]);

	// Return as base64 string
	return combined.toString("base64");
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * @param ciphertext - Base64-encoded ciphertext (with IV and auth tag)
 * @param masterKey - 256-bit key as hex string (64 characters)
 * @returns Decrypted plaintext
 *
 * @throws Error if:
 * - Ciphertext is invalid
 * - Authentication tag verification fails (data tampered)
 * - Wrong decryption key used
 */
export function decrypt(ciphertext: string, masterKey: string): string {
	// Convert hex key to buffer (32 bytes)
	const keyBuffer = Buffer.from(masterKey, "hex");

	if (keyBuffer.length !== 32) {
		throw new Error(
			"Invalid master key length. Expected 32 bytes (64 hex characters)",
		);
	}

	// Decode base64 ciphertext
	let combined: Buffer;
	try {
		combined = Buffer.from(ciphertext, "base64");
	} catch (_error) {
		throw new Error("Invalid ciphertext: not valid base64");
	}

	// Minimum length: 12 (IV) + 16 (auth tag) = 28 bytes
	if (combined.length < 28) {
		throw new Error("Invalid ciphertext: too short");
	}

	// Extract components
	const iv = combined.subarray(0, 12); // First 12 bytes
	const authTag = combined.subarray(combined.length - 16); // Last 16 bytes
	const encrypted = combined.subarray(12, combined.length - 16); // Middle part

	// Create decipher
	const decipher: Decipher = createDecipheriv("aes-256-gcm", keyBuffer, iv);

	// Set authentication tag
	// Type assertion needed as some TS versions don't include setAuthTag in Decipher type
	(decipher as Decipher & { setAuthTag(buffer: Buffer): Decipher }).setAuthTag(
		authTag,
	);

	try {
		// Decrypt
		let decrypted = decipher.update(encrypted, undefined, "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	} catch (_error) {
		// This typically happens when:
		// 1. Wrong decryption key
		// 2. Data has been tampered with (auth tag mismatch)
		// 3. Corrupted ciphertext
		throw new Error("Decryption failed: invalid key or tampered data");
	}
}
