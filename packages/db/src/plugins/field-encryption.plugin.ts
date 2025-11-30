import type { Schema } from "mongoose";

/**
 * Field Encryption Plugin for Mongoose
 *
 * Automatically encrypts specified fields before saving to database
 * and decrypts them when reading from database.
 *
 * Uses AES-256-GCM encryption for both confidentiality and authenticity.
 *
 * @example
 * ```typescript
 * import { fieldEncryptionPlugin } from './plugins/field-encryption.plugin';
 *
 * patientSchema.plugin(fieldEncryptionPlugin, {
 *   fields: ['firstName', 'lastName', 'phone', 'email'],
 *   getMasterKey: () => process.env.ENCRYPTION_MASTER_KEY
 * });
 * ```
 */

export interface FieldEncryptionOptions {
	/**
	 * Array of field paths to encrypt
	 * Supports nested fields using dot notation (e.g., 'address.street')
	 */
	fields: string[];

	/**
	 * Function that returns the master encryption key
	 * Should return a 64-character hex string (32 bytes)
	 */
	getMasterKey: () => string | undefined;

	/**
	 * Optional prefix for encrypted values (for debugging/identification)
	 * Default: 'enc:'
	 */
	encryptedPrefix?: string;
}

/**
 * Field encryption plugin
 *
 * IMPORTANT: This plugin requires the encrypt/decrypt functions to be imported
 * at runtime from the server package. The db package cannot directly import
 * from the server package due to circular dependencies.
 *
 * The encryption/decryption is performed using dynamic imports when needed.
 */
export function fieldEncryptionPlugin(
	schema: Schema,
	options: FieldEncryptionOptions,
) {
	const { fields, getMasterKey, encryptedPrefix = "enc:" } = options;

	if (!fields || fields.length === 0) {
		return; // No fields to encrypt
	}

	/**
	 * Get value from object using dot notation path
	 */
	function getFieldValue(obj: unknown, path: string): unknown {
		const parts = path.split(".");
		let current: Record<string, unknown> = obj as Record<string, unknown>;

		for (const part of parts) {
			if (current == null) return undefined;
			current = current[part] as Record<string, unknown>;
		}

		return current;
	}

	/**
	 * Set value in object using dot notation path
	 */
	function setFieldValue(obj: unknown, path: string, value: unknown): void {
		const parts = path.split(".");
		let current: Record<string, unknown> = obj as Record<string, unknown>;

		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (part === undefined) continue;

			if (current[part] == null) {
				current[part] = {};
			}
			current = current[part] as Record<string, unknown>;
		}

		const lastPart = parts[parts.length - 1];
		if (lastPart) {
			current[lastPart] = value;
		}
	}

	/**
	 * Check if a value is already encrypted
	 */
	function isEncrypted(value: unknown): value is string {
		return (
			typeof value === "string" && value.startsWith(encryptedPrefix || "enc:")
		);
	}

	/**
	 * Encrypt a field value
	 */
	async function encryptField(value: unknown): Promise<string | null> {
		if (value == null || value === "") return null;
		if (isEncrypted(value)) return value; // Already encrypted

		const masterKey = getMasterKey();
		if (!masterKey) {
			console.warn(
				"[field-encryption] No master key provided - skipping encryption",
			);
			return String(value);
		}

		try {
			// Dynamic import to avoid circular dependency
			// This assumes the encrypt function is available in the server's utils
			const { encrypt } = await import(
				"../../../../apps/server/src/utils/encryption"
			);
			const encrypted = encrypt(String(value), masterKey);
			return `${encryptedPrefix}${encrypted}`;
		} catch (error) {
			console.error("[field-encryption] Encryption failed:", error);
			throw new Error("Failed to encrypt field");
		}
	}

	/**
	 * Decrypt a field value
	 */
	async function decryptField(value: unknown): Promise<string | null> {
		if (value == null || value === "") return null;
		if (!isEncrypted(value)) return String(value); // Not encrypted

		const masterKey = getMasterKey();
		if (!masterKey) {
			console.warn(
				"[field-encryption] No master key provided - skipping decryption",
			);
			return value;
		}

		try {
			// Remove prefix and decrypt
			const encryptedValue = value.substring(encryptedPrefix.length);

			// Dynamic import to avoid circular dependency
			const { decrypt } = await import(
				"../../../../apps/server/src/utils/encryption"
			);
			return decrypt(encryptedValue, masterKey);
		} catch (error) {
			console.error("[field-encryption] Decryption failed:", error);
			throw new Error("Failed to decrypt field");
		}
	}

	/**
	 * Pre-save hook: Encrypt fields before saving
	 */
	schema.pre("save", async function (next) {
		try {
			// Only encrypt if document is new or specified fields were modified
			for (const field of fields) {
				if (this.isNew || this.isModified(field)) {
					const value = getFieldValue(this, field);
					if (value != null && value !== "") {
						const encrypted = await encryptField(value);
						setFieldValue(this, field, encrypted);
					}
				}
			}
			next();
		} catch (error) {
			next(error as Error);
		}
	});

	/**
	 * Pre-update hooks: Encrypt fields in update operations
	 */
	schema.pre("findOneAndUpdate", async function (next) {
		try {
			const update = this.getUpdate() as Record<string, unknown>;
			if (!update) return next();

			// Handle $set operator
			if (update.$set) {
				for (const field of fields) {
					const value = getFieldValue(update.$set, field);
					if (value != null && value !== "" && !isEncrypted(value)) {
						const encrypted = await encryptField(value);
						setFieldValue(update.$set, field, encrypted);
					}
				}
			}

			// Handle direct field updates (no operator)
			for (const field of fields) {
				if (field in update && update[field] != null) {
					const value = update[field];
					if (!isEncrypted(value)) {
						update[field] = await encryptField(value);
					}
				}
			}

			next();
		} catch (error) {
			next(error as Error);
		}
	});

	schema.pre("updateOne", async function (next) {
		try {
			const update = this.getUpdate() as Record<string, unknown>;
			if (!update) return next();

			// Handle $set operator
			if (update.$set) {
				for (const field of fields) {
					const value = getFieldValue(update.$set, field);
					if (value != null && value !== "" && !isEncrypted(value)) {
						const encrypted = await encryptField(value);
						setFieldValue(update.$set, field, encrypted);
					}
				}
			}

			next();
		} catch (error) {
			next(error as Error);
		}
	});

	/**
	 * Post-find hooks: Decrypt fields after reading
	 */
	schema.post("find", async (docs: unknown[]) => {
		if (!docs || docs.length === 0) return;

		for (const doc of docs) {
			for (const field of fields) {
				const value = getFieldValue(doc, field);
				if (value != null && isEncrypted(value)) {
					try {
						const decrypted = await decryptField(value);
						setFieldValue(doc, field, decrypted);
					} catch (error) {
						console.error(
							`[field-encryption] Failed to decrypt ${field}:`,
							error,
						);
						// Leave encrypted value as-is on decryption failure
					}
				}
			}
		}
	});

	schema.post("findOne", async (doc: unknown) => {
		if (!doc) return;

		for (const field of fields) {
			const value = getFieldValue(doc, field);
			if (value != null && isEncrypted(value)) {
				try {
					const decrypted = await decryptField(value);
					setFieldValue(doc, field, decrypted);
				} catch (error) {
					console.error(
						`[field-encryption] Failed to decrypt ${field}:`,
						error,
					);
					// Leave encrypted value as-is on decryption failure
				}
			}
		}
	});

	schema.post("findOneAndUpdate", async (doc: unknown) => {
		if (!doc) return;

		for (const field of fields) {
			const value = getFieldValue(doc, field);
			if (value != null && isEncrypted(value)) {
				try {
					const decrypted = await decryptField(value);
					setFieldValue(doc, field, decrypted);
				} catch (error) {
					console.error(
						`[field-encryption] Failed to decrypt ${field}:`,
						error,
					);
					// Leave encrypted value as-is on decryption failure
				}
			}
		}
	});
}
