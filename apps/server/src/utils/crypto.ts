/**
 * Cryptographic utilities
 *
 * Password hashing, comparison, and temporary password generation.
 * Uses bcryptjs for secure password hashing.
 */

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Default salt rounds for bcrypt hashing
 * OWASP recommends 12 for bcrypt
 */
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(
	password: string,
	hashedPassword: string,
): Promise<boolean> {
	return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a cryptographically secure temporary password
 *
 * Uses crypto.randomInt() for cryptographically secure random generation.
 * Ensures at least one of each required character type:
 * - Uppercase letter
 * - Lowercase letter
 * - Number
 * - Special character (@$!%*?&)
 *
 * @returns A 12-character random password
 */
export function generateTemporaryPassword(): string {
	const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const lowercase = "abcdefghijklmnopqrstuvwxyz";
	const numbers = "0123456789";
	const special = "@$!%*?&";
	const allChars = uppercase + lowercase + numbers + special;

	const chars: string[] = [];

	// Ensure at least one of each required type using crypto.randomInt
	chars.push(uppercase.charAt(randomInt(uppercase.length)));
	chars.push(lowercase.charAt(randomInt(lowercase.length)));
	chars.push(numbers.charAt(randomInt(numbers.length)));
	chars.push(special.charAt(randomInt(special.length)));

	// Fill the rest (12 characters total)
	for (let i = 4; i < 12; i++) {
		chars.push(allChars.charAt(randomInt(allChars.length)));
	}

	// Fisher-Yates shuffle with cryptographically secure randomness
	for (let i = chars.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		const temp = chars[i];
		chars[i] = chars[j] as string;
		chars[j] = temp as string;
	}

	return chars.join("");
}
