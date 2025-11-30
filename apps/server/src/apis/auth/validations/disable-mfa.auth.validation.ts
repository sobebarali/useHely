// No request body validation needed for POST /api/auth/mfa/disable
// Authentication is handled by middleware

// Output type - manually defined for response structure
export interface DisableMfaOutput {
	disabled: boolean;
	message: string;
}
