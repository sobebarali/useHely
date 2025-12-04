/**
 * Download Export Service
 *
 * Business logic for downloading exported data
 */

import { DataSubjectRequestStatus } from "@hms/db";
import {
	BadRequestError,
	ForbiddenError,
	GoneError,
	NotFoundError,
} from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { getComplianceExportKey, getExportDownloadUrl } from "@/lib/storage";
import { ComplianceErrorCodes } from "../compliance.constants";
import { findDataSubjectRequestById } from "../repositories/shared.compliance.repository";

const logger = createServiceLogger("downloadExport");

export async function downloadExportService({
	tenantId,
	userId,
	requestId,
}: {
	tenantId: string;
	userId: string;
	requestId: string;
}): Promise<{
	format: string;
	content: string | Record<string, unknown>;
	filename: string;
	downloadUrl?: string;
}> {
	logger.info({ tenantId, userId, requestId }, "Downloading export");

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
			"You can only download your own export",
			ComplianceErrorCodes.REQUEST_NOT_YOURS,
		);
	}

	// Check status
	if (request.status !== DataSubjectRequestStatus.COMPLETED) {
		throw new BadRequestError(
			"Export is not ready for download",
			ComplianceErrorCodes.EXPORT_NOT_READY,
		);
	}

	// Check if expired
	if (request.downloadExpiry && new Date() > request.downloadExpiry) {
		throw new GoneError(
			"Export download has expired",
			ComplianceErrorCodes.EXPORT_EXPIRED,
		);
	}

	const timestamp = new Date().toISOString().split("T")[0];
	const formatType = request.format || "json";
	const extension = formatType === "csv" ? "csv" : "json";
	const filename = `data-export-${timestamp}.${extension}`;

	// Check if we have a download URL (R2 storage)
	if (request.downloadUrl) {
		// Generate a fresh presigned URL
		const key = getComplianceExportKey({
			tenantId,
			requestId,
			format: formatType as "json" | "csv",
		});

		const freshUrl = await getExportDownloadUrl({ key, expiresIn: 3600 });

		logSuccess(
			logger,
			{ requestId, format: formatType },
			"Export download URL generated",
		);

		return {
			format: formatType,
			content: {},
			filename,
			downloadUrl: freshUrl || request.downloadUrl,
		};
	}

	// Fallback to exportData stored in MongoDB
	const exportData = request.exportData as {
		format: string;
		content: string | Record<string, unknown>;
	};

	if (!exportData) {
		throw new BadRequestError(
			"Export data not found",
			ComplianceErrorCodes.EXPORT_FAILED,
		);
	}

	logSuccess(
		logger,
		{ requestId, format: exportData.format },
		"Export downloaded",
	);

	return {
		format: exportData.format,
		content: exportData.content,
		filename,
	};
}
