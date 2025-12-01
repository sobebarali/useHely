/**
 * List Requests Service
 *
 * Business logic for listing all data subject requests (admin)
 */

import { createServiceLogger } from "@/lib/logger";
import { listDataSubjectRequests } from "../repositories/admin.compliance.repository";
import type {
	ListRequestsInput,
	ListRequestsOutput,
} from "../validations/list-requests.compliance.validation";

const logger = createServiceLogger("listRequests");

export async function listRequestsService({
	tenantId,
	type,
	status,
	startDate,
	endDate,
	page,
	limit,
}: { tenantId: string } & ListRequestsInput): Promise<ListRequestsOutput> {
	logger.info(
		{ tenantId, type, status, page, limit },
		"Listing data subject requests",
	);

	const result = await listDataSubjectRequests({
		tenantId,
		type,
		status,
		startDate,
		endDate,
		page,
		limit,
	});

	const data = result.data.map((request) => ({
		requestId: request._id,
		type: request.type,
		userId: request.userId,
		userEmail: request.userEmail,
		status: request.status,
		createdAt: request.createdAt.toISOString(),
		scheduledCompletion: request.scheduledAt
			? request.scheduledAt.toISOString()
			: undefined,
	}));

	return {
		data,
		pagination: {
			page,
			limit,
			total: result.total,
		},
	};
}
