import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Consent Purposes
export const ConsentPurpose = {
	TERMS_OF_SERVICE: "terms_of_service",
	PRIVACY_POLICY: "privacy_policy",
	MARKETING_EMAILS: "marketing_emails",
	SMS_NOTIFICATIONS: "sms_notifications",
	ANALYTICS: "analytics",
	THIRD_PARTY_SHARING: "third_party_sharing",
} as const;

export type ConsentPurposeValue =
	(typeof ConsentPurpose)[keyof typeof ConsentPurpose];

// Consent Source
export const ConsentSource = {
	REGISTRATION: "registration",
	SETTINGS: "settings",
	PROMPT: "prompt",
	API: "api",
} as const;

export type ConsentSourceValue =
	(typeof ConsentSource)[keyof typeof ConsentSource];

// Main schema
const consentSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Organization", required: true },
		userId: { type: String, ref: "User", required: true },

		// Consent details
		purpose: {
			type: String,
			enum: Object.values(ConsentPurpose),
			required: true,
		},
		description: { type: String },
		granted: { type: Boolean, required: true },
		version: { type: String, default: "1.0" },

		// Source and context
		source: {
			type: String,
			enum: Object.values(ConsentSource),
			required: true,
		},
		ipAddress: { type: String },
		userAgent: { type: String },

		// Timestamps for consent actions
		grantedAt: { type: Date },
		withdrawnAt: { type: Date },
	},
	{
		collection: "consent",
		timestamps: true,
	},
);

// Indexes
// Unique constraint: one consent record per user per purpose per tenant
consentSchema.index({ tenantId: 1, userId: 1, purpose: 1 }, { unique: true });
consentSchema.index({ tenantId: 1, userId: 1 });
consentSchema.index({ tenantId: 1, purpose: 1, granted: 1 });

const Consent = model("Consent", consentSchema);

export { Consent };
