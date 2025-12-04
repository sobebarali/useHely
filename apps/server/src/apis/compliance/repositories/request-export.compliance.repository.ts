/**
 * Request Export Repository
 *
 * Database operations for creating data export requests
 * Export files are stored in R2, only metadata is stored in MongoDB
 */

import {
	DataSubjectRequest,
	DataSubjectRequestStatus,
	DataSubjectRequestType,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import type { RequestExportInput } from "../validations/request-export.compliance.validation";
import type { DataSubjectRequestDocument } from "./shared.compliance.repository";

const logger = createRepositoryLogger("requestExport");

/**
 * Create a new data export request
 */
export async function createExportRequest({
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
} & RequestExportInput): Promise<DataSubjectRequestDocument> {
	const requestId = uuidv4();

	logger.debug({ tenantId, userId, format }, "Creating export request");

	await DataSubjectRequest.create({
		_id: requestId,
		tenantId,
		userId,
		userEmail,
		type: DataSubjectRequestType.EXPORT,
		status: DataSubjectRequestStatus.PENDING,
		format,
		includeAuditLog,
		ipAddress,
		userAgent,
	});

	const request =
		await DataSubjectRequest.findById(
			requestId,
		).lean<DataSubjectRequestDocument>();

	logDatabaseOperation(
		logger,
		"create",
		"data_subject_request",
		{ tenantId, userId },
		{ _id: requestId },
	);

	if (!request) {
		throw new Error("Failed to create export request");
	}
	return request;
}

/**
 * Update export request with R2 download URL and storage key
 */
export async function updateExportWithDownloadUrl({
	requestId,
	tenantId,
	downloadUrl,
	storageKey,
	downloadExpiry,
}: {
	requestId: string;
	tenantId: string;
	downloadUrl: string;
	storageKey: string;
	downloadExpiry: Date;
}): Promise<DataSubjectRequestDocument | null> {
	const now = new Date();

	logger.debug({ requestId, tenantId }, "Updating export with download URL");

	const updated = await DataSubjectRequest.findOneAndUpdate(
		{ _id: requestId, tenantId },
		{
			$set: {
				status: DataSubjectRequestStatus.COMPLETED,
				downloadUrl,
				metadata: { storageKey },
				completedAt: now,
				downloadExpiry,
				updatedAt: now,
			},
		},
		{ new: true },
	).lean<DataSubjectRequestDocument>();

	if (updated) {
		logDatabaseOperation(
			logger,
			"update",
			"data_subject_request",
			{ requestId },
			{ status: "COMPLETED", hasDownloadUrl: true },
		);
	}

	return updated;
}

/**
 * Mark export as expired
 */
export async function markExportExpired({
	requestId,
	tenantId,
}: {
	requestId: string;
	tenantId: string;
}): Promise<DataSubjectRequestDocument | null> {
	const now = new Date();

	const updated = await DataSubjectRequest.findOneAndUpdate(
		{ _id: requestId, tenantId },
		{
			$set: {
				status: DataSubjectRequestStatus.EXPIRED,
				updatedAt: now,
			},
		},
		{ new: true },
	).lean<DataSubjectRequestDocument>();

	return updated;
}

/**
 * Mark export as failed with error details
 */
export async function markExportFailed({
	requestId,
	tenantId,
	errorMessage,
}: {
	requestId: string;
	tenantId: string;
	errorMessage: string;
}): Promise<DataSubjectRequestDocument | null> {
	const now = new Date();

	logger.debug(
		{ requestId, tenantId, errorMessage },
		"Marking export as failed",
	);

	const updated = await DataSubjectRequest.findOneAndUpdate(
		{ _id: requestId, tenantId },
		{
			$set: {
				status: DataSubjectRequestStatus.FAILED,
				metadata: { errorMessage, failedAt: now.toISOString() },
				updatedAt: now,
			},
		},
		{ new: true },
	).lean<DataSubjectRequestDocument>();

	if (updated) {
		logDatabaseOperation(
			logger,
			"update",
			"data_subject_request",
			{ requestId },
			{ status: "FAILED", errorMessage },
		);
	}

	return updated;
}
