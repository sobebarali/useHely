/**
 * Get Key Status Repository
 *
 * Database operations for retrieving encryption key status and rotation history
 */

import { KeyRotation } from "@hms/db";

/**
 * Find the most recent key rotation record
 */
export async function findLatestKeyRotation(): Promise<{
	keyId: string;
	rotatedAt: Date;
	rotatedBy: string;
	recordsReEncrypted: number;
} | null> {
	const rotation = await KeyRotation.findOne()
		.sort({ rotatedAt: -1 })
		.select("keyId rotatedAt rotatedBy recordsReEncrypted")
		.lean();

	return rotation;
}

/**
 * Count total number of key rotations
 */
export async function countKeyRotations(): Promise<number> {
	const count = await KeyRotation.countDocuments();
	return count;
}

/**
 * Find the most recent rotation for a specific key ID
 */
export async function findLatestRotationForKey({
	keyId,
}: {
	keyId: string;
}): Promise<{
	keyId: string;
	rotatedAt: Date;
	rotatedBy: string;
	recordsReEncrypted: number;
} | null> {
	const rotation = await KeyRotation.findOne({ keyId })
		.sort({ rotatedAt: -1 })
		.select("keyId rotatedAt rotatedBy recordsReEncrypted")
		.lean();

	return rotation;
}
