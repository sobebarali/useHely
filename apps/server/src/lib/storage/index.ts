/**
 * Storage Service
 *
 * High-level storage operations for the HMS application
 * Provides domain-specific storage utilities built on top of R2
 */

import { createServiceLogger } from "../logger";
import {
	deleteFile,
	fileExists,
	getFile,
	getSignedDownloadUrl,
	getSignedUploadUrl,
	isR2Configured,
	R2_BUCKET_NAME,
	uploadFile,
} from "./r2";

const logger = createServiceLogger("storage");

/**
 * Storage key prefixes for different resource types
 */
export const StoragePrefixes = {
	PATIENT_PHOTOS: "patients/photos",
	AUDIT_EXPORTS: "exports/audit",
	COMPLIANCE_EXPORTS: "exports/compliance",
	REPORTS: "exports/reports",
	DOCUMENTS: "documents",
} as const;

/**
 * Supported content types
 */
export const ContentTypes = {
	JPEG: "image/jpeg",
	PNG: "image/png",
	PDF: "application/pdf",
	CSV: "text/csv",
	JSON: "application/json",
	XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	PARQUET: "application/octet-stream",
} as const;

/**
 * Generate storage key for patient photo
 */
export function getPatientPhotoKey({
	tenantId,
	patientId,
	extension = "jpg",
}: {
	tenantId: string;
	patientId: string;
	extension?: string;
}): string {
	return `${StoragePrefixes.PATIENT_PHOTOS}/${tenantId}/${patientId}.${extension}`;
}

/**
 * Generate storage key for audit export
 */
export function getAuditExportKey({
	tenantId,
	exportId,
	format,
}: {
	tenantId: string;
	exportId: string;
	format: "json" | "csv" | "parquet";
}): string {
	return `${StoragePrefixes.AUDIT_EXPORTS}/${tenantId}/${exportId}.${format}`;
}

/**
 * Generate storage key for compliance export
 */
export function getComplianceExportKey({
	tenantId,
	requestId,
	format,
}: {
	tenantId: string;
	requestId: string;
	format: "json" | "csv";
}): string {
	return `${StoragePrefixes.COMPLIANCE_EXPORTS}/${tenantId}/${requestId}.${format}`;
}

/**
 * Generate storage key for report
 */
export function getReportKey({
	tenantId,
	reportId,
	format,
}: {
	tenantId: string;
	reportId: string;
	format: "json" | "csv" | "pdf" | "xlsx";
}): string {
	return `${StoragePrefixes.REPORTS}/${tenantId}/${reportId}.${format}`;
}

/**
 * Upload patient photo from base64 string
 */
export async function uploadPatientPhoto({
	tenantId,
	patientId,
	base64Data,
}: {
	tenantId: string;
	patientId: string;
	base64Data: string;
}): Promise<string | null> {
	if (!isR2Configured) {
		logger.warn(
			{ tenantId, patientId },
			"R2 not configured, skipping photo upload",
		);
		return null;
	}

	// Parse base64 data URI
	const matches = base64Data.match(/^data:image\/(jpeg|png|jpg);base64,(.+)$/);
	if (!matches || !matches[1] || !matches[2]) {
		logger.error({ tenantId, patientId }, "Invalid base64 image format");
		throw new Error(
			"Invalid base64 image format. Expected: data:image/jpeg;base64,... or data:image/png;base64,...",
		);
	}

	const imageType = matches[1];
	const imageData = matches[2];
	const extension = imageType === "jpeg" ? "jpg" : imageType;
	const contentType =
		imageType === "png" ? ContentTypes.PNG : ContentTypes.JPEG;
	const buffer = Buffer.from(imageData, "base64");

	const key = getPatientPhotoKey({ tenantId, patientId, extension });

	const result = await uploadFile({
		key,
		body: buffer,
		contentType,
		metadata: {
			tenantId,
			patientId,
			uploadedAt: new Date().toISOString(),
		},
	});

	if (!result) {
		return null;
	}

	logger.info(
		{ tenantId, patientId, key },
		"Patient photo uploaded successfully",
	);

	// Return a presigned URL for immediate access (1 hour)
	return getSignedDownloadUrl({ key, expiresIn: 3600 });
}

/**
 * Get patient photo URL (generates presigned URL)
 */
export async function getPatientPhotoUrl({
	tenantId,
	patientId,
	extension = "jpg",
	expiresIn = 3600,
}: {
	tenantId: string;
	patientId: string;
	extension?: string;
	expiresIn?: number;
}): Promise<string | null> {
	const key = getPatientPhotoKey({ tenantId, patientId, extension });

	// Check if file exists
	const exists = await fileExists({ key });
	if (!exists) {
		return null;
	}

	return getSignedDownloadUrl({ key, expiresIn });
}

/**
 * Delete patient photo
 */
export async function deletePatientPhoto({
	tenantId,
	patientId,
	extension = "jpg",
}: {
	tenantId: string;
	patientId: string;
	extension?: string;
}): Promise<boolean> {
	const key = getPatientPhotoKey({ tenantId, patientId, extension });
	return deleteFile({ key });
}

/**
 * Upload export file (audit, compliance, or report)
 */
export async function uploadExportFile({
	tenantId,
	exportId,
	type,
	format,
	data,
}: {
	tenantId: string;
	exportId: string;
	type: "audit" | "compliance" | "report";
	format: "json" | "csv" | "pdf" | "xlsx" | "parquet";
	data: Buffer | string;
}): Promise<{ key: string; downloadUrl: string | null } | null> {
	if (!isR2Configured) {
		logger.warn(
			{ tenantId, exportId, type },
			"R2 not configured, skipping export upload",
		);
		return null;
	}

	let key: string;
	let contentType: string;

	switch (type) {
		case "audit":
			key = getAuditExportKey({
				tenantId,
				exportId,
				format: format as "json" | "csv" | "parquet",
			});
			break;
		case "compliance":
			key = getComplianceExportKey({
				tenantId,
				requestId: exportId,
				format: format as "json" | "csv",
			});
			break;
		case "report":
			key = getReportKey({
				tenantId,
				reportId: exportId,
				format: format as "json" | "csv" | "pdf" | "xlsx",
			});
			break;
	}

	switch (format) {
		case "json":
			contentType = ContentTypes.JSON;
			break;
		case "csv":
			contentType = ContentTypes.CSV;
			break;
		case "pdf":
			contentType = ContentTypes.PDF;
			break;
		case "xlsx":
			contentType = ContentTypes.XLSX;
			break;
		case "parquet":
			contentType = ContentTypes.PARQUET;
			break;
		default:
			contentType = "application/octet-stream";
	}

	const body = typeof data === "string" ? Buffer.from(data, "utf-8") : data;

	const result = await uploadFile({
		key,
		body,
		contentType,
		metadata: {
			tenantId,
			exportId,
			type,
			format,
			createdAt: new Date().toISOString(),
		},
	});

	if (!result) {
		return null;
	}

	// Generate download URL (24 hours for exports)
	const downloadUrl = await getSignedDownloadUrl({ key, expiresIn: 86400 });

	logger.info(
		{ tenantId, exportId, type, format, key },
		"Export file uploaded successfully",
	);

	return { key, downloadUrl };
}

/**
 * Get export file download URL
 */
export async function getExportDownloadUrl({
	key,
	expiresIn = 86400,
}: {
	key: string;
	expiresIn?: number;
}): Promise<string | null> {
	return getSignedDownloadUrl({ key, expiresIn });
}

/**
 * Delete export file
 */
export async function deleteExportFile({
	key,
}: {
	key: string;
}): Promise<boolean> {
	return deleteFile({ key });
}

// Re-export R2 utilities for direct access if needed
export {
	uploadFile,
	getFile,
	deleteFile,
	getSignedDownloadUrl,
	getSignedUploadUrl,
	fileExists,
	isR2Configured,
	R2_BUCKET_NAME,
};
