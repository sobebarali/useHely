import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Consent History Action
export const ConsentHistoryAction = {
	GRANTED: "granted",
	WITHDRAWN: "withdrawn",
	UPDATED: "updated",
} as const;

export type ConsentHistoryActionValue =
	(typeof ConsentHistoryAction)[keyof typeof ConsentHistoryAction];

// Main schema - immutable audit trail for consent changes
const consentHistorySchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		consentId: { type: String, ref: "Consent", required: true },
		userId: { type: String, ref: "User", required: true },

		// Consent details at time of action
		purpose: { type: String, required: true },
		action: {
			type: String,
			enum: Object.values(ConsentHistoryAction),
			required: true,
		},
		version: { type: String },

		// Context
		source: { type: String, required: true },
		ipAddress: { type: String },
		userAgent: { type: String },

		// When this action occurred
		timestamp: { type: Date, required: true, default: Date.now },

		// Snapshot of previous state (for audit)
		previousState: {
			type: Schema.Types.Mixed,
		},
	},
	{
		collection: "consent_history",
		timestamps: true,
	},
);

// Indexes for efficient queries
consentHistorySchema.index({
	tenantId: 1,
	userId: 1,
	purpose: 1,
	timestamp: -1,
});
consentHistorySchema.index({ tenantId: 1, consentId: 1, timestamp: -1 });
consentHistorySchema.index({ tenantId: 1, userId: 1, timestamp: -1 });

const ConsentHistory = model("ConsentHistory", consentHistorySchema);

export { ConsentHistory };
