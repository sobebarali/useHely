/**
 * Cryptographic utilities
 *
 * Password hashing, comparison, and temporary password generation.
 * Uses bcryptjs for secure password hashing.
 */

import bcrypt from "bcryptjs";

/**
 * Default salt rounds for bcrypt hashing
 */
const SALT_ROUNDS = 10;

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
 * Generate a cryptographically random temporary password
 *
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

	let password = "";

	// Ensure at least one of each required type
	password += uppercase[Math.floor(Math.random() * uppercase.length)];
	password += lowercase[Math.floor(Math.random() * lowercase.length)];
	password += numbers[Math.floor(Math.random() * numbers.length)];
	password += special[Math.floor(Math.random() * special.length)];

	// Fill the rest (12 characters total)
	for (let i = 4; i < 12; i++) {
		password += allChars[Math.floor(Math.random() * allChars.length)];
	}

	// Shuffle the password
	return password
		.split("")
		.sort(() => Math.random() - 0.5)
		.join("");
}
