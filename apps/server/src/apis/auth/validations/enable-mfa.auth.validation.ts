// No request body validation needed for POST /api/auth/mfa/enable
// Authentication is handled by middleware

// Output type - manually defined for response structure
export interface EnableMfaOutput {
	secret: string; // Base32-encoded TOTP secret
	qrCodeDataUrl: string; // QR code as data URL for scanning with authenticator app
	backupCodes: string[]; // One-time use recovery codes (plain text, for user to save)
}
