/**
 * Request Export Service
 *
 * Business logic for requesting data export
 * Uses BullMQ for background processing and Cloudflare R2 for file storage
 */

import { DataExportFormat, DataSubjectRequestType } from "@hms/db";
import { BadRequestError, ConflictError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { enqueueComplianceExport } from "@/lib/queue";
import { isR2Configured } from "@/lib/storage";
import {
	ComplianceErrorCodes,
	ComplianceMessages,
	EXPORT_MAX_PROCESSING_HOURS,
} from "../compliance.constants";
import { createExportRequest } from "../repositories/request-export.compliance.repository";
import { findPendingRequestByUser } from "../repositories/shared.compliance.repository";
import type {
	RequestExportInput,
	RequestExportOutput,
} from "../validations/request-export.compliance.validation";

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
	if (!isR2Configured()) {
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

	// Enqueue background job for processing
	const formatType = format === DataExportFormat.CSV ? "csv" : "json";
	await enqueueComplianceExport({
		requestId: request._id,
		tenantId,
		userId,
		userEmail,
		format: formatType,
		includeAuditLog: includeAuditLog ?? false,
	});

	// Calculate estimated completion
	const estimatedCompletion = new Date();
	estimatedCompletion.setHours(
		estimatedCompletion.getHours() + EXPORT_MAX_PROCESSING_HOURS,
	);

	logSuccess(
		logger,
		{ requestId: request._id },
		ComplianceMessages.EXPORT_REQUESTED,
	);

	// Return immediately with PENDING status
	// Client should poll for completion
	const result: RequestExportOutput = {
		requestId: request._id,
		type: request.type,
		status: request.status,
		format: request.format || DataExportFormat.JSON,
		createdAt: request.createdAt.toISOString(),
		estimatedCompletion: estimatedCompletion.toISOString(),
	};

	return result;
}
