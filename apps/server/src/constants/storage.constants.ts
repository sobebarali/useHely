/**
 * Storage Constants
 *
 * Configuration values for file storage operations
 */

/**
 * Maximum file sizes (in bytes)
 */
export const StorageLimits = {
	/** Maximum patient photo size: 5MB */
	PATIENT_PHOTO_MAX_SIZE: 5 * 1024 * 1024,
	/** Maximum export file size: 100MB */
	EXPORT_MAX_SIZE: 100 * 1024 * 1024,
	/** Maximum document size: 25MB */
	DOCUMENT_MAX_SIZE: 25 * 1024 * 1024,
} as const;

/**
 * Presigned URL expiration times (in seconds)
 */
export const StorageUrlExpiry = {
	/** Patient photo download URL: 1 hour */
	PATIENT_PHOTO_DOWNLOAD: 3600,
	/** Export file download URL: 24 hours */
	EXPORT_DOWNLOAD: 86400,
	/** Upload URL: 15 minutes */
	UPLOAD: 900,
	/** Short-lived URL: 5 minutes */
	SHORT: 300,
} as const;

/**
 * File retention periods (in days)
 */
export const StorageRetention = {
	/** Audit exports: 7 days */
	AUDIT_EXPORT: 7,
	/** Compliance exports: 30 days (GDPR requirement) */
	COMPLIANCE_EXPORT: 30,
	/** Reports: 90 days */
	REPORT: 90,
	/** Temporary files: 1 day */
	TEMPORARY: 1,
} as const;

/**
 * Allowed MIME types
 */
export const AllowedMimeTypes = {
	IMAGES: ["image/jpeg", "image/png", "image/jpg"],
	DOCUMENTS: ["application/pdf"],
	EXPORTS: [
		"application/json",
		"text/csv",
		"application/pdf",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/octet-stream", // for parquet
	],
} as const;

/**
 * Storage error codes
 */
export const StorageErrorCodes = {
	FILE_TOO_LARGE: "FILE_TOO_LARGE",
	INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
	UPLOAD_FAILED: "UPLOAD_FAILED",
	DOWNLOAD_FAILED: "DOWNLOAD_FAILED",
	FILE_NOT_FOUND: "FILE_NOT_FOUND",
	STORAGE_NOT_CONFIGURED: "STORAGE_NOT_CONFIGURED",
} as const;

/**
 * Storage success messages
 */
export const StorageMessages = {
	UPLOAD_SUCCESS: "File uploaded successfully",
	DELETE_SUCCESS: "File deleted successfully",
	URL_GENERATED: "Download URL generated successfully",
} as const;
