/**
 * Rotate Keys Validation
 *
 * Endpoint: POST /api/security/keys/rotate
 * Description: Rotates the encryption master key and re-encrypts all encrypted data
 * Auth: Required (SECURITY:MANAGE permission)
 */

export interface RotateKeysOutput {
	newKeyId: string; // First 8 chars of new master key (masked)
	previousKeyId: string; // First 8 chars of previous master key
	rotatedAt: string; // ISO 8601 date of rotation
	rotatedBy: string; // User ID who performed rotation
	recordsReEncrypted: number; // Total number of records re-encrypted
	breakdown: {
		patients: number;
		prescriptions: number;
		vitals: number;
		staff: number;
	};
}
