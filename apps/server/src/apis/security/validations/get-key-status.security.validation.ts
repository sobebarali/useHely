/**
 * Get Key Status Validation
 *
 * Endpoint: GET /api/security/keys/status
 * Description: Retrieves current encryption key status and rotation history
 * Auth: Required (SECURITY:VIEW permission)
 */

export interface KeyStatusOutput {
	currentKeyId: string; // First 8 chars of current master key (masked)
	lastRotation: {
		rotatedAt: string; // ISO 8601 date of last rotation
		rotatedBy: string; // User ID who performed rotation
		recordsReEncrypted: number; // Number of records re-encrypted
		daysSinceRotation: number; // Days since last rotation
	} | null; // Null if never rotated
	rotationRecommended: boolean; // True if > 90 days since last rotation
	totalRotations: number; // Total number of rotations in history
}
