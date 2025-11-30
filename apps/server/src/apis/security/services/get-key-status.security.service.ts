/**
 * Get Key Status Service
 *
 * Business logic for retrieving encryption key status and rotation history
 */

import { InternalError } from "@/errors";
import { logger } from "@/lib/logger";
import {
	countKeyRotations,
	findLatestKeyRotation,
} from "../repositories/get-key-status.security.repository";
import type { KeyStatusOutput } from "../validations/get-key-status.security.validation";

const ROTATION_RECOMMENDATION_DAYS = 90;

/**
 * Get current encryption key status
 *
 * Returns information about the current master encryption key,
 * including rotation history and recommendations.
 *
 * @throws {InternalError} If master key is not configured
 */
export async function getKeyStatus(): Promise<KeyStatusOutput> {
	const startTime = Date.now();

	// Get current master key from environment
	const masterKey = process.env.ENCRYPTION_MASTER_KEY;
	if (!masterKey) {
		logger.error("ENCRYPTION_MASTER_KEY not configured in environment");
		throw new InternalError(
			"ENCRYPTION_KEY_NOT_CONFIGURED",
			"Encryption master key is not configured",
		);
	}

	// Extract key ID (first 8 chars of the master key)
	const currentKeyId = masterKey.substring(0, 8);

	// Find latest rotation record
	const latestRotation = await findLatestKeyRotation();

	// Count total rotations
	const totalRotations = await countKeyRotations();

	// Build response
	let lastRotation: KeyStatusOutput["lastRotation"] = null;
	let rotationRecommended = false;

	if (latestRotation) {
		const rotatedAtDate = new Date(latestRotation.rotatedAt);
		const now = new Date();
		const daysSinceRotation = Math.floor(
			(now.getTime() - rotatedAtDate.getTime()) / (1000 * 60 * 60 * 24),
		);

		lastRotation = {
			rotatedAt: rotatedAtDate.toISOString(),
			rotatedBy: latestRotation.rotatedBy,
			recordsReEncrypted: latestRotation.recordsReEncrypted,
			daysSinceRotation,
		};

		// Recommend rotation if > 90 days since last rotation
		rotationRecommended = daysSinceRotation > ROTATION_RECOMMENDATION_DAYS;
	} else {
		// Never rotated - recommend rotation
		rotationRecommended = true;
	}

	const duration = Date.now() - startTime;
	logger.info(
		{
			currentKeyId,
			totalRotations,
			rotationRecommended,
			duration,
		},
		"Key status retrieved successfully",
	);

	return {
		currentKeyId,
		lastRotation,
		rotationRecommended,
		totalRotations,
	};
}
