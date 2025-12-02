import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Request Types
export const DataSubjectRequestType = {
	EXPORT: "EXPORT",
	DELETION: "DELETION",
} as const;

export type DataSubjectRequestTypeValue =
	(typeof DataSubjectRequestType)[keyof typeof DataSubjectRequestType];

// Request Status
export const DataSubjectRequestStatus = {
	PENDING: "PENDING",
	PENDING_VERIFICATION: "PENDING_VERIFICATION",
	VERIFICATION_EXPIRED: "VERIFICATION_EXPIRED",
	VERIFIED: "VERIFIED",
	PROCESSING: "PROCESSING",
	COMPLETED: "COMPLETED",
	EXPIRED: "EXPIRED",
	CANCELLED: "CANCELLED",
	FAILED: "FAILED",
} as const;

export type DataSubjectRequestStatusValue =
	(typeof DataSubjectRequestStatus)[keyof typeof DataSubjectRequestStatus];

// Export Format
export const DataExportFormat = {
	JSON: "json",
	CSV: "csv",
} as const;

export type DataExportFormatValue =
	(typeof DataExportFormat)[keyof typeof DataExportFormat];

// Admin Action
export const AdminAction = {
	APPROVE: "approve",
	REJECT: "reject",
	EXPEDITE: "expedite",
} as const;

export type AdminActionValue = (typeof AdminAction)[keyof typeof AdminAction];

// Main schema
const dataSubjectRequestSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Organization", required: true },
		userId: { type: String, ref: "User", required: true },
		userEmail: { type: String, required: true },

		// Request type
		type: {
			type: String,
			enum: Object.values(DataSubjectRequestType),
			required: true,
		},

		// Request status
		status: {
			type: String,
			enum: Object.values(DataSubjectRequestStatus),
			required: true,
			default: DataSubjectRequestStatus.PENDING,
		},

		// Export-specific fields
		format: {
			type: String,
			enum: Object.values(DataExportFormat),
		},
		includeAuditLog: { type: Boolean, default: true },

		// Deletion-specific fields
		reason: { type: String },
		confirmEmail: { type: String },

		// Verification (for deletion)
		verificationToken: { type: String }, // Hashed token
		verificationTokenExpiry: { type: Date },
		verifiedAt: { type: Date },

		// Scheduling (for deletion grace period)
		scheduledAt: { type: Date },
		gracePeriodEnds: { type: Date },

		// Completion
		completedAt: { type: Date },

		// Export download
		downloadUrl: { type: String },
		downloadExpiry: { type: Date },
		exportData: { type: Schema.Types.Mixed }, // Stored export data (for simple implementation)

		// Admin processing
		processedBy: { type: String, ref: "User" },
		processedAt: { type: Date },
		adminAction: {
			type: String,
			enum: Object.values(AdminAction),
		},
		adminNotes: { type: String },

		// Request metadata
		ipAddress: { type: String },
		userAgent: { type: String },

		// Flexible metadata storage
		metadata: { type: Schema.Types.Mixed },
	},
	{
		collection: "data_subject_request",
		timestamps: true,
	},
);

// Indexes for efficient queries
dataSubjectRequestSchema.index({ tenantId: 1, userId: 1, type: 1, status: 1 });
dataSubjectRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
dataSubjectRequestSchema.index(
	{ verificationToken: 1 },
	{ sparse: true, unique: true },
);
dataSubjectRequestSchema.index({ scheduledAt: 1 }, { sparse: true }); // For deletion scheduler
dataSubjectRequestSchema.index({ downloadExpiry: 1 }, { sparse: true }); // For cleanup

const DataSubjectRequest = model(
	"DataSubjectRequest",
	dataSubjectRequestSchema,
);

export { DataSubjectRequest };
