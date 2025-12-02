import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Event Categories
export const AuditEventCategory = {
	AUTH: "AUTH",
	PHI: "PHI",
	ADMIN: "ADMIN",
	SECURITY: "SECURITY",
	DATA: "DATA",
} as const;

export type AuditEventCategoryValue =
	(typeof AuditEventCategory)[keyof typeof AuditEventCategory];

// Event Types
export const AuditEventType = {
	// AUTH
	AUTH_LOGIN: "AUTH_LOGIN",
	AUTH_LOGOUT: "AUTH_LOGOUT",
	AUTH_FAILED: "AUTH_FAILED",
	AUTH_TOKEN_REFRESH: "AUTH_TOKEN_REFRESH",
	AUTH_PASSWORD_CHANGE: "AUTH_PASSWORD_CHANGE",
	// PHI
	PHI_VIEW: "PHI_VIEW",
	PHI_CREATE: "PHI_CREATE",
	PHI_UPDATE: "PHI_UPDATE",
	PHI_DELETE: "PHI_DELETE",
	PHI_EXPORT: "PHI_EXPORT",
	PHI_PRINT: "PHI_PRINT",
	PRESCRIPTION_VIEW: "PRESCRIPTION_VIEW",
	PRESCRIPTION_CREATE: "PRESCRIPTION_CREATE",
	VITALS_VIEW: "VITALS_VIEW",
	VITALS_CREATE: "VITALS_CREATE",
	// ADMIN
	ADMIN_USER_CREATE: "ADMIN_USER_CREATE",
	ADMIN_USER_UPDATE: "ADMIN_USER_UPDATE",
	ADMIN_USER_DEACTIVATE: "ADMIN_USER_DEACTIVATE",
	ADMIN_ROLE_CHANGE: "ADMIN_ROLE_CHANGE",
	ADMIN_CONFIG_CHANGE: "ADMIN_CONFIG_CHANGE",
	// SECURITY
	SECURITY_MFA_ENABLE: "SECURITY_MFA_ENABLE",
	SECURITY_MFA_DISABLE: "SECURITY_MFA_DISABLE",
	SECURITY_KEY_ROTATE: "SECURITY_KEY_ROTATE",
} as const;

export type AuditEventTypeValue =
	(typeof AuditEventType)[keyof typeof AuditEventType];

// Actions
export const AuditAction = {
	CREATE: "CREATE",
	READ: "READ",
	UPDATE: "UPDATE",
	DELETE: "DELETE",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

// Main schema
const auditLogSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Organization", required: true },
		eventType: {
			type: String,
			enum: Object.values(AuditEventType),
			required: true,
		},
		category: {
			type: String,
			enum: Object.values(AuditEventCategory),
			required: true,
		},
		userId: { type: String, ref: "User", required: true },
		userName: { type: String, required: true },
		resourceType: { type: String }, // patient, prescription, vitals, etc.
		resourceId: { type: String },
		action: { type: String, enum: Object.values(AuditAction) },
		ip: { type: String },
		userAgent: { type: String },
		sessionId: { type: String },
		details: { type: Schema.Types.Mixed }, // { fieldsAccessed: [...] }
		before: { type: Schema.Types.Mixed }, // State before update
		after: { type: Schema.Types.Mixed }, // State after update
		hash: { type: String, required: true }, // Integrity hash
		previousHash: { type: String }, // Chain link to previous entry
		timestamp: { type: Date, required: true, default: Date.now },
	},
	{
		collection: "audit_log",
		timestamps: true,
	},
);

// Indexes for efficient queries
// NO TTL index - 6-year retention required for HIPAA compliance
auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
auditLogSchema.index({
	tenantId: 1,
	resourceType: 1,
	resourceId: 1,
	timestamp: -1,
});
auditLogSchema.index({ tenantId: 1, category: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, eventType: 1, timestamp: -1 });

const AuditLog = model("AuditLog", auditLogSchema);

export { AuditLog };
