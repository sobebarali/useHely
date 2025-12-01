/**
 * Admin Compliance Repository
 *
 * Database operations for admin compliance endpoints
 */

import { DataSubjectRequest, DataSubjectRequestType } from "@hms/db";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import type { DataSubjectRequestDocument } from "./shared.compliance.repository";

const logger = createRepositoryLogger("adminCompliance");

export interface ListRequestsQuery {
	tenantId: string;
	type?: "export" | "deletion" | "all";
	status?: string;
	startDate?: string;
	endDate?: string;
	page: number;
	limit: number;
}

export interface ListRequestsResult {
	data: DataSubjectRequestDocument[];
	total: number;
}

/**
 * List all data subject requests with filtering and pagination
 */
export async function listDataSubjectRequests({
	tenantId,
	type,
	status,
	startDate,
	endDate,
	page,
	limit,
}: ListRequestsQuery): Promise<ListRequestsResult> {
	logger.debug(
		{ tenantId, type, status, page, limit },
		"Listing data subject requests",
	);

	// Build query filter
	const filter: Record<string, unknown> = { tenantId };

	if (type && type !== "all") {
		filter.type =
			type === "export"
				? DataSubjectRequestType.EXPORT
				: DataSubjectRequestType.DELETION;
	}

	if (status) {
		filter.status = status.toUpperCase();
	}

	if (startDate || endDate) {
		filter.createdAt = {};
		if (startDate) {
			(filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
		}
		if (endDate) {
			(filter.createdAt as Record<string, Date>).$lte = new Date(endDate);
		}
	}

	const skip = (page - 1) * limit;

	const [data, total] = await Promise.all([
		DataSubjectRequest.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean<DataSubjectRequestDocument[]>(),
		DataSubjectRequest.countDocuments(filter),
	]);

	logDatabaseOperation(
		logger,
		"find",
		"data_subject_request",
		{ tenantId, type, status },
		{ count: data.length, total },
	);

	return { data, total };
}

/**
 * Update request with admin action
 */
export async function updateRequestWithAdminAction({
	requestId,
	tenantId,
	adminId,
	action,
	notes,
	newStatus,
}: {
	requestId: string;
	tenantId: string;
	adminId: string;
	action: string;
	notes?: string;
	newStatus: string;
}): Promise<DataSubjectRequestDocument | null> {
	const now = new Date();

	logger.debug(
		{ requestId, tenantId, action },
		"Updating request with admin action",
	);

	const updated = await DataSubjectRequest.findOneAndUpdate(
		{ _id: requestId, tenantId },
		{
			$set: {
				status: newStatus,
				processedBy: adminId,
				processedAt: now,
				adminAction: action,
				adminNotes: notes,
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
			{ action, newStatus },
		);
	}

	return updated;
}
