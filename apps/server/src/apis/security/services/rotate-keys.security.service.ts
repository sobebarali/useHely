/**
 * Rotate Keys Service
 *
 * Business logic for encryption key rotation and re-encryption of all encrypted data
 */

import { InternalError } from "@/errors";
import { logger } from "@/lib/logger";
import { decrypt, encrypt, generateMasterKey } from "@/utils/encryption";
import { emitSecurityEvent } from "@/utils/security-events";
import {
	createKeyRotation,
	reEncryptPatients,
	reEncryptPrescriptions,
	reEncryptStaff,
	reEncryptVitals,
} from "../repositories/rotate-keys.security.repository";
import type { RotateKeysOutput } from "../validations/rotate-keys.security.validation";

/**
 * Rotate encryption master key
 *
 * Generates a new master key, re-encrypts all encrypted data,
 * and creates a rotation audit record.
 *
 * IMPORTANT: After this operation completes successfully, you MUST:
 * 1. Update ENCRYPTION_MASTER_KEY in .env with the new key
 * 2. Restart the server
 *
 * @throws {InternalError} If current master key is not configured
 */
export async function rotateKeys({
	userId,
	tenantId,
}: {
	userId: string;
	tenantId: string;
}): Promise<RotateKeysOutput> {
	const startTime = Date.now();

	// Validate current master key exists
	const oldKey = process.env.ENCRYPTION_MASTER_KEY;
	if (!oldKey) {
		logger.error("ENCRYPTION_MASTER_KEY not configured in environment");
		throw new InternalError(
			"ENCRYPTION_KEY_NOT_CONFIGURED",
			"Encryption master key is not configured",
		);
	}

	logger.info({ userId }, "Starting key rotation process");

	// Generate new master key
	const newKey = generateMasterKey();
	const oldKeyId = oldKey.substring(0, 8);
	const newKeyId = newKey.substring(0, 8);

	logger.info(
		{ oldKeyId, newKeyId },
		"Generated new master key, starting re-encryption",
	);

	// Re-encrypt all encrypted data
	const breakdown = {
		patients: 0,
		prescriptions: 0,
		vitals: 0,
		staff: 0,
	};

	try {
		// Re-encrypt patients
		logger.info("Re-encrypting patient records");
		breakdown.patients = await reEncryptPatients({
			decrypt,
			encrypt,
			oldKey,
			newKey,
		});
		logger.info({ count: breakdown.patients }, "Patient records re-encrypted");

		// Re-encrypt prescriptions
		logger.info("Re-encrypting prescription records");
		breakdown.prescriptions = await reEncryptPrescriptions({
			decrypt,
			encrypt,
			oldKey,
			newKey,
		});
		logger.info(
			{ count: breakdown.prescriptions },
			"Prescription records re-encrypted",
		);

		// Re-encrypt vitals
		logger.info("Re-encrypting vitals records");
		breakdown.vitals = await reEncryptVitals({
			decrypt,
			encrypt,
			oldKey,
			newKey,
		});
		logger.info({ count: breakdown.vitals }, "Vitals records re-encrypted");

		// Re-encrypt staff
		logger.info("Re-encrypting staff records");
		breakdown.staff = await reEncryptStaff({
			decrypt,
			encrypt,
			oldKey,
			newKey,
		});
		logger.info({ count: breakdown.staff }, "Staff records re-encrypted");

		const totalRecords =
			breakdown.patients +
			breakdown.prescriptions +
			breakdown.vitals +
			breakdown.staff;

		// Create rotation record
		const rotation = await createKeyRotation({
			keyId: newKeyId,
			rotatedBy: userId,
			recordsReEncrypted: totalRecords,
		});

		// Update environment variable for this process
		// NOTE: This only updates the current process - operator must update .env and restart
		process.env.ENCRYPTION_MASTER_KEY = newKey;

		const duration = Date.now() - startTime;

		logger.warn(
			{
				newKeyId,
				totalRecords,
				breakdown,
				duration,
			},
			"Key rotation completed - MUST update .env and restart server",
		);

		// Emit security event (fire-and-forget)
		emitSecurityEvent({
			type: "KEY_ROTATION",
			severity: "high",
			tenantId,
			userId,
			details: {
				previousKeyId: oldKeyId,
				newKeyId,
				recordsReEncrypted: totalRecords,
				breakdown,
				duration,
			},
		});

		return {
			newKeyId,
			previousKeyId: oldKeyId,
			rotatedAt: rotation.rotatedAt.toISOString(),
			rotatedBy: rotation.rotatedBy,
			recordsReEncrypted: totalRecords,
			breakdown,
		};
	} catch (error) {
		logger.error(
			{ error, oldKeyId, newKeyId },
			"Key rotation failed during re-encryption",
		);

		// Emit failure event
		emitSecurityEvent({
			type: "KEY_ROTATION",
			severity: "critical",
			tenantId,
			userId,
			details: {
				failed: true,
				error: error instanceof Error ? error.message : "Unknown error",
				previousKeyId: oldKeyId,
				attemptedNewKeyId: newKeyId,
			},
		});

		throw new InternalError(
			"KEY_ROTATION_FAILED",
			"Failed to rotate encryption keys. Database may be in inconsistent state. Please contact support immediately.",
		);
	}
}
