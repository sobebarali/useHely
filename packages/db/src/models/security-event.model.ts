import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Event types
export const SecurityEventType = {
	AUTH_FAILED: "AUTH_FAILED",
	AUTH_LOCKOUT: "AUTH_LOCKOUT",
	PERMISSION_DENIED: "PERMISSION_DENIED",
	MFA_FAILED: "MFA_FAILED",
	MFA_ENABLED: "MFA_ENABLED",
	MFA_DISABLED: "MFA_DISABLED",
	SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
	KEY_ROTATION: "KEY_ROTATION",
	ADMIN_ACTION: "ADMIN_ACTION",
} as const;

export type SecurityEventTypeValue =
	(typeof SecurityEventType)[keyof typeof SecurityEventType];

// Severity levels
export const SecurityEventSeverity = {
	LOW: "low",
	MEDIUM: "medium",
	HIGH: "high",
	CRITICAL: "critical",
} as const;

export type SecurityEventSeverityValue =
	(typeof SecurityEventSeverity)[keyof typeof SecurityEventSeverity];

// Main schema
const securityEventSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital" },
		type: {
			type: String,
			enum: Object.values(SecurityEventType),
			required: true,
		},
		severity: {
			type: String,
			enum: Object.values(SecurityEventSeverity),
			required: true,
		},
		userId: { type: String, ref: "User" },
		ip: { type: String },
		userAgent: { type: String },
		details: { type: Schema.Types.Mixed },
		timestamp: { type: Date, required: true, default: Date.now },
		createdAt: { type: Date, required: true },
		updatedAt: { type: Date, required: true },
	},
	{
		collection: "security_event",
		timestamps: true,
	},
);

// Indexes for efficient queries
securityEventSchema.index({ tenantId: 1, type: 1 });
securityEventSchema.index({ tenantId: 1, severity: 1 });
securityEventSchema.index({ tenantId: 1, timestamp: -1 });
securityEventSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });

// TTL index: automatically delete events older than 90 days
// MongoDB will run background cleanup every 60 seconds
securityEventSchema.index(
	{ timestamp: 1 },
	{ expireAfterSeconds: 90 * 24 * 60 * 60 }, // 90 days in seconds
);

const SecurityEvent = model("SecurityEvent", securityEventSchema);

export { SecurityEvent };
