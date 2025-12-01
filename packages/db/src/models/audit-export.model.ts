import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Export Status
export const AuditExportStatus = {
	PENDING: "PENDING",
	PROCESSING: "PROCESSING",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
} as const;

export type AuditExportStatusValue =
	(typeof AuditExportStatus)[keyof typeof AuditExportStatus];

// Export Format
export const AuditExportFormat = {
	JSON: "json",
	CSV: "csv",
	PARQUET: "parquet",
} as const;

export type AuditExportFormatValue =
	(typeof AuditExportFormat)[keyof typeof AuditExportFormat];

// Main schema
const auditExportSchema = new Schema(
	{
		_id: { type: String },
		tenantId: { type: String, ref: "Hospital", required: true },
		status: {
			type: String,
			enum: Object.values(AuditExportStatus),
			required: true,
			default: AuditExportStatus.PENDING,
		},
		format: {
			type: String,
			enum: Object.values(AuditExportFormat),
			required: true,
			default: AuditExportFormat.JSON,
		},
		startDate: { type: Date, required: true },
		endDate: { type: Date, required: true },
		categories: [{ type: String }],
		estimatedRecords: { type: Number },
		processedRecords: { type: Number, default: 0 },
		downloadUrl: { type: String },
		errorMessage: { type: String },
		requestedBy: { type: String, ref: "User", required: true },
		completedAt: { type: Date },
		expiresAt: { type: Date }, // Auto-cleanup after 24 hours
	},
	{
		collection: "audit_export",
		timestamps: true,
	},
);

// Indexes
auditExportSchema.index({ tenantId: 1, createdAt: -1 });
auditExportSchema.index({ tenantId: 1, status: 1 });
auditExportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

const AuditExport = model("AuditExport", auditExportSchema);

export { AuditExport };
