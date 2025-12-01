/**
 * Request Export Service
 *
 * Business logic for requesting data export
 */

import { DataExportFormat, DataSubjectRequestType } from "@hms/db";
import { ConflictError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import {
	ComplianceErrorCodes,
	ComplianceMessages,
	EXPORT_DOWNLOAD_EXPIRY_DAYS,
	EXPORT_MAX_PROCESSING_HOURS,
} from "../compliance.constants";
import {
	createExportRequest,
	markExportFailed,
	updateExportWithData,
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

	// For simplicity, process export synchronously
	// In production, this would be a background job
	try {
		const collectedData = await collectUserData({
			tenantId,
			userId,
			includeAuditLog,
		});

		// Prepare export data based on format
		let exportData: Record<string, unknown>;
		if (format === DataExportFormat.CSV) {
			exportData = {
				format: "csv",
				content: convertToCSV(collectedData),
			};
		} else {
			exportData = {
				format: "json",
				content: collectedData,
			};
		}

		// Calculate download expiry
		const downloadExpiry = new Date();
		downloadExpiry.setDate(
			downloadExpiry.getDate() + EXPORT_DOWNLOAD_EXPIRY_DAYS,
		);

		// Update request with export data
		const updated = await updateExportWithData({
			requestId: request._id,
			tenantId,
			exportData,
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
