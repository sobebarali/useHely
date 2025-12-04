/**
 * Request Export Service
 *
 * Business logic for requesting data export
 * Uses Cloudflare R2 for file storage
 */

import { DataExportFormat, DataSubjectRequestType } from "@hms/db";
import { BadRequestError, ConflictError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { isR2Configured, uploadExportFile } from "@/lib/storage";
import {
	ComplianceErrorCodes,
	ComplianceMessages,
	EXPORT_DOWNLOAD_EXPIRY_DAYS,
	EXPORT_MAX_PROCESSING_HOURS,
} from "../compliance.constants";
import {
	createExportRequest,
	markExportFailed,
	updateExportWithDownloadUrl,
} from "../repositories/request-export.compliance.repository";
import { findPendingRequestByUser } from "../repositories/shared.compliance.repository";
import type {
	RequestExportInput,
	RequestExportOutput,
} from "../validations/request-export.compliance.validation";
import {
	collectUserData,
	convertToCSV,
} from "./data-collector.compliance.service";

const logger = createServiceLogger("requestExport");

export async function requestExportService({
	tenantId,
	userId,
	userEmail,
	format,
	includeAuditLog,
	ipAddress,
	userAgent,
}: {
	tenantId: string;
	userId: string;
	userEmail: string;
	ipAddress?: string;
	userAgent?: string;
} & RequestExportInput): Promise<RequestExportOutput> {
	logger.info({ tenantId, userId, format }, "Processing data export request");

	// Check if R2 storage is configured
	if (!isR2Configured) {
		throw new BadRequestError(
			"Storage service is not configured. Please contact your administrator.",
			"STORAGE_NOT_CONFIGURED",
		);
	}

	// Check for existing pending request
	const existingRequest = await findPendingRequestByUser({
		tenantId,
		userId,
		type: DataSubjectRequestType.EXPORT,
	});

	if (existingRequest) {
		throw new ConflictError(
			"A data export request is already pending",
			ComplianceErrorCodes.EXPORT_PENDING,
		);
	}

	// Create export request
	const request = await createExportRequest({
		tenantId,
		userId,
		userEmail,
		format,
		includeAuditLog,
		ipAddress,
		userAgent,
	});

	// Track final status for response
	let finalStatus = request.status;

	// Process export synchronously
	// In production, this would be a background job for large exports
	try {
		const collectedData = await collectUserData({
			tenantId,
			userId,
			includeAuditLog,
		});

		// Calculate download expiry
		const downloadExpiry = new Date();
		downloadExpiry.setDate(
			downloadExpiry.getDate() + EXPORT_DOWNLOAD_EXPIRY_DAYS,
		);

		// Prepare export content based on format
		let exportContent: string;
		const formatType = format === DataExportFormat.CSV ? "csv" : "json";

		if (format === DataExportFormat.CSV) {
			exportContent = convertToCSV(collectedData);
		} else {
			exportContent = JSON.stringify(
				{
					requestId: request._id,
					userId,
					exportedAt: new Date().toISOString(),
					data: collectedData,
				},
				null,
				2,
			);
		}

		// Upload to R2
		const uploadResult = await uploadExportFile({
			tenantId,
			exportId: request._id,
			type: "compliance",
			format: formatType,
			data: exportContent,
		});

		if (!uploadResult?.downloadUrl) {
			throw new Error("Failed to upload export file to storage");
		}

		// Update request with download URL
		const updated = await updateExportWithDownloadUrl({
			requestId: request._id,
			tenantId,
			downloadUrl: uploadResult.downloadUrl,
			storageKey: uploadResult.key,
			downloadExpiry,
		});

		if (updated) {
			finalStatus = updated.status;
		}

		logger.info(
			{ requestId: request._id, format },
			"Data export completed successfully",
		);
	} catch (error) {
		// Mark export as failed and log error
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error during export";

		await markExportFailed({
			requestId: request._id,
			tenantId,
			errorMessage,
		});

		finalStatus = "FAILED";

		logger.error(
			{ error, requestId: request._id, errorMessage },
			"Error processing export - marked as FAILED",
		);
	}

	// Calculate estimated completion
	const estimatedCompletion = new Date();
	estimatedCompletion.setHours(
		estimatedCompletion.getHours() + EXPORT_MAX_PROCESSING_HOURS,
	);

	const result: RequestExportOutput = {
		requestId: request._id,
		type: request.type,
		status: finalStatus,
		format: request.format || DataExportFormat.JSON,
		createdAt: request.createdAt.toISOString(),
		estimatedCompletion: estimatedCompletion.toISOString(),
	};

	logSuccess(
		logger,
		{ requestId: request._id },
		ComplianceMessages.EXPORT_REQUESTED,
	);

	return result;
}
