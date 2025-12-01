/**
 * Compliance API Constants
 *
 * Constants for GDPR compliance features including data export,
 * data deletion, and consent management.
 */

// Grace period for deletion requests (in days)
export const DELETION_GRACE_PERIOD_DAYS = 30;

// Verification token expiry (in hours)
export const VERIFICATION_TOKEN_EXPIRY_HOURS = 48;

// Export download link expiry (in days)
export const EXPORT_DOWNLOAD_EXPIRY_DAYS = 7;

// Maximum processing time for exports (in hours)
export const EXPORT_MAX_PROCESSING_HOURS = 72;

// Consent purposes with descriptions
export const CONSENT_PURPOSES = {
	terms_of_service: {
		id: "terms_of_service",
		name: "Terms of Service",
		description: "Agreement to the terms of service",
		required: true,
	},
	privacy_policy: {
		id: "privacy_policy",
		name: "Privacy Policy",
		description: "Acknowledgment of the privacy policy",
		required: true,
	},
	marketing_emails: {
		id: "marketing_emails",
		name: "Marketing Emails",
		description: "Receive promotional emails and newsletters",
		required: false,
	},
	sms_notifications: {
		id: "sms_notifications",
		name: "SMS Notifications",
		description: "Receive SMS notifications for appointments and updates",
		required: false,
	},
	analytics: {
		id: "analytics",
		name: "Usage Analytics",
		description: "Allow usage analytics for service improvement",
		required: false,
	},
	third_party_sharing: {
		id: "third_party_sharing",
		name: "Third Party Sharing",
		description: "Allow data sharing with partner services",
		required: false,
	},
} as const;

// Error codes
export const ComplianceErrorCodes = {
	// General
	REQUEST_NOT_FOUND: "REQUEST_NOT_FOUND",
	REQUEST_NOT_YOURS: "REQUEST_NOT_YOURS",
	INVALID_REQUEST: "INVALID_REQUEST",

	// Export
	EXPORT_PENDING: "EXPORT_PENDING",
	EXPORT_NOT_READY: "EXPORT_NOT_READY",
	EXPORT_EXPIRED: "EXPORT_EXPIRED",
	EXPORT_FAILED: "EXPORT_FAILED",

	// Deletion
	DELETION_PENDING: "DELETION_PENDING",
	DELETION_ALREADY_VERIFIED: "DELETION_ALREADY_VERIFIED",
	DELETION_NOT_VERIFIED: "DELETION_NOT_VERIFIED",
	DELETION_CANNOT_CANCEL: "DELETION_CANNOT_CANCEL",
	VERIFICATION_EXPIRED: "VERIFICATION_EXPIRED",
	VERIFICATION_INVALID: "VERIFICATION_INVALID",
	EMAIL_MISMATCH: "EMAIL_MISMATCH",

	// Consent
	CONSENT_NOT_FOUND: "CONSENT_NOT_FOUND",
	CONSENT_NOT_GRANTED: "CONSENT_NOT_GRANTED",
	CONSENT_ALREADY_WITHDRAWN: "CONSENT_ALREADY_WITHDRAWN",
	INVALID_PURPOSE: "INVALID_PURPOSE",
} as const;

// Success messages
export const ComplianceMessages = {
	EXPORT_REQUESTED: "Data export request submitted successfully",
	EXPORT_READY: "Your data export is ready for download",
	EXPORT_PROCESSING: "Your data export is being processed",

	DELETION_REQUESTED:
		"Verification email sent. Please confirm within 48 hours.",
	DELETION_VERIFIED:
		"Deletion request verified. You can cancel within the grace period.",
	DELETION_CANCELLED: "Deletion request cancelled. Your data is safe.",
	DELETION_SCHEDULED: "Data deletion has been scheduled",

	CONSENT_RECORDED: "Consent recorded successfully",
	CONSENT_WITHDRAWN:
		"Consent withdrawn. Related processing will stop within 24 hours.",
} as const;
