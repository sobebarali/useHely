/**
 * Get Export Status Service
 *
 * Business logic for checking data export request status
 */

import { DataExportFormat, DataSubjectRequestStatus } from "@hms/db";
import { ForbiddenError, GoneError, NotFoundError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { ComplianceErrorCodes } from "../compliance.constants";
import { findDataSubjectRequestById } from "../repositories/shared.compliance.repository";
import type { GetExportStatusOutput } from "../validations/get-export-status.compliance.validation";

const logger = createServiceLogger("getExportStatus");

export async function getExportStatusService({
	tenantId,
	userId,
	requestId,
}: {
	tenantId: string;
	userId: string;
	requestId: string;
}): Promise<GetExportStatusOutput> {
	logger.info({ tenantId, userId, requestId }, "Getting export status");

	const request = await findDataSubjectRequestById({ tenantId, requestId });

	if (!request) {
		throw new NotFoundError(
			"Export request not found",
			ComplianceErrorCodes.REQUEST_NOT_FOUND,
		);
	}

	// Verify ownership
	if (request.userId !== userId) {
		throw new ForbiddenError(
			"You can only view your own export requests",
			ComplianceErrorCodes.REQUEST_NOT_YOURS,
		);
	}

	// Check if expired
	if (
		request.status === DataSubjectRequestStatus.COMPLETED &&
		request.downloadExpiry &&
		new Date() > request.downloadExpiry
	) {
		throw new GoneError(
			"Export download has expired",
			ComplianceErrorCodes.EXPORT_EXPIRED,
		);
	}

	// Build download URL (internal endpoint)
	const downloadUrl =
		request.status === DataSubjectRequestStatus.COMPLETED
			? `/api/compliance/data-export/${request._id}/download`
			: null;

	const result: GetExportStatusOutput = {
		requestId: request._id,
		type: request.type,
		status: request.status,
		format: request.format || DataExportFormat.JSON,
		createdAt: request.createdAt.toISOString(),
		completedAt: request.completedAt?.toISOString() || null,
		downloadUrl,
		expiresAt: request.downloadExpiry?.toISOString() || null,
	};

	logSuccess(
		logger,
		{ requestId, status: request.status },
		"Export status retrieved",
	);

	return result;
}
