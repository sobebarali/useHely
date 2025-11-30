import { randomBytes } from "node:crypto";
import { compare as bcryptCompare, hash as bcryptHash } from "bcryptjs";
import QRCode from "qrcode";
import speakeasy from "speakeasy";

/**
 * Generate a TOTP secret for MFA
 *
 * Returns a base32-encoded secret that can be used with authenticator apps
 * like Google Authenticator, Authy, Microsoft Authenticator, etc.
 *
 * @returns Base32-encoded secret string
 */
export function generateTotpSecret(): string {
	const secret = speakeasy.generateSecret({
		length: 32, // 32 bytes = 256 bits of entropy
		name: "HMS", // Will be overridden in QR code generation
	});

	if (!secret.base32) {
		throw new Error("Failed to generate TOTP secret");
	}

	return secret.base32;
}

/**
 * Generate a QR code data URL for TOTP setup
 *
 * The QR code can be scanned by authenticator apps to automatically
 * configure the TOTP secret.
 *
 * @param params - QR code generation parameters
 * @param params.secret - Base32-encoded TOTP secret
 * @param params.email - User's email address
 * @param params.issuer - Application name (e.g., "Hospital Management System")
 * @returns Data URL string containing the QR code image
 */
export async function generateQrCodeDataUrl({
	secret,
	email,
	issuer,
}: {
	secret: string;
	email: string;
	issuer: string;
}): Promise<string> {
	// Generate otpauth URL
	const otpauthUrl = speakeasy.otpauthURL({
		secret,
		label: email,
		issuer,
		encoding: "base32",
	});

	// Generate QR code as data URL
	try {
		const dataUrl = await QRCode.toDataURL(otpauthUrl);
		return dataUrl;
	} catch (_error) {
		throw new Error("Failed to generate QR code");
	}
}

/**
 * Verify a TOTP code
 *
 * Validates a 6-digit TOTP code against the secret.
 * Uses a time window to account for clock drift.
 *
 * @param params - Verification parameters
 * @param params.secret - Base32-encoded TOTP secret
 * @param params.code - 6-digit TOTP code from user
 * @returns true if code is valid, false otherwise
 */
export function verifyTotp({
	secret,
	code,
}: {
	secret: string;
	code: string;
}): boolean {
	// Validate code format
	if (!/^\d{6}$/.test(code)) {
		return false;
	}

	try {
		const verified = speakeasy.totp.verify({
			secret,
			encoding: "base32",
			token: code,
			window: 1, // Allow 1 step before/after current time (30 seconds each)
		});

		return verified;
	} catch (_error) {
		return false;
	}
}

/**
 * Generate backup codes for MFA recovery
 *
 * Backup codes are one-time use codes that can be used if the user
 * loses access to their authenticator device.
 *
 * @param count - Number of backup codes to generate (default: 10)
 * @returns Array of backup codes
 */
export function generateBackupCodes(count = 10): string[] {
	const codes: string[] = [];

	for (let i = 0; i < count; i++) {
		// Generate 8-character alphanumeric code
		const code = randomBytes(4).toString("hex").toUpperCase();
		codes.push(code);
	}

	return codes;
}

/**
 * Hash a backup code for secure storage
 *
 * Uses bcrypt to hash backup codes before storing them in the database.
 * This prevents backup codes from being stolen if the database is compromised.
 *
 * @param code - Plain text backup code
 * @returns Bcrypt hash of the backup code
 */
export async function hashBackupCode(code: string): Promise<string> {
	const saltRounds = 10; // Balance between security and performance
	const hashedCode = await bcryptHash(code, saltRounds);
	return hashedCode;
}

/**
 * Verify a backup code against its hash
 *
 * @param params - Verification parameters
 * @param params.code - Plain text backup code from user
 * @param params.hashedCode - Bcrypt hash stored in database
 * @returns true if code matches hash, false otherwise
 */
export async function verifyBackupCode({
	code,
	hashedCode,
}: {
	code: string;
	hashedCode: string;
}): Promise<boolean> {
	try {
		const isValid = await bcryptCompare(code, hashedCode);
		return isValid;
	} catch (_error) {
		return false;
	}
}
