/**
 * Get Deletion Status Service
 *
 * Business logic for checking deletion request status
 */

import { DataSubjectRequestStatus } from "@hms/db";
import { ForbiddenError, NotFoundError } from "@/errors";
import { createServiceLogger } from "@/lib/logger";
import { ComplianceErrorCodes } from "../compliance.constants";
import { findDataSubjectRequestById } from "../repositories/shared.compliance.repository";
import type { GetDeletionStatusOutput } from "../validations/get-deletion-status.compliance.validation";

const logger = createServiceLogger("getDeletionStatus");

export async function getDeletionStatusService({
	tenantId,
	userId,
	requestId,
}: {
	tenantId: string;
	userId: string;
	requestId: string;
}): Promise<GetDeletionStatusOutput> {
	logger.info({ tenantId, requestId }, "Getting deletion request status");

	// Find the request
	const request = await findDataSubjectRequestById({ tenantId, requestId });

	if (!request) {
		throw new NotFoundError(
			"Deletion request not found",
			ComplianceErrorCodes.REQUEST_NOT_FOUND,
		);
	}

	// Verify ownership
	if (request.userId !== userId) {
		throw new ForbiddenError(
			"You can only view your own requests",
			ComplianceErrorCodes.REQUEST_NOT_YOURS,
		);
	}

	// Determine if request can be cancelled
	const cancellableStatuses = [
		DataSubjectRequestStatus.PENDING_VERIFICATION,
		DataSubjectRequestStatus.VERIFIED,
	];

	let canCancel = cancellableStatuses.includes(
		request.status as (typeof cancellableStatuses)[number],
	);

	// If verified, also check grace period
	if (
		request.status === DataSubjectRequestStatus.VERIFIED &&
		request.gracePeriodEnds
	) {
		canCancel = new Date() <= new Date(request.gracePeriodEnds);
	}

	const result: GetDeletionStatusOutput = {
		requestId: request._id,
		type: request.type,
		status: request.status,
		createdAt: request.createdAt.toISOString(),
		canCancel,
	};

	// Add optional fields if present
	if (request.verifiedAt) {
		result.verifiedAt = request.verifiedAt.toISOString();
	}

	if (request.scheduledAt) {
		result.scheduledDeletion = request.scheduledAt.toISOString();
	}

	if (request.gracePeriodEnds) {
		result.gracePeriodEnds = request.gracePeriodEnds.toISOString();
	}

	return result;
}
