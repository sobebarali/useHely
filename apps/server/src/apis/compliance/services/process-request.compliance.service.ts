/**
 * Process Request Service
 *
 * Business logic for processing data subject requests (admin)
 */

import { DataSubjectRequestStatus } from "@hms/db";
import { BadRequestError, NotFoundError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { ComplianceErrorCodes } from "../compliance.constants";
import { updateRequestWithAdminAction } from "../repositories/admin.compliance.repository";
import { findDataSubjectRequestById } from "../repositories/shared.compliance.repository";
import type {
	ProcessRequestInput,
	ProcessRequestOutput,
} from "../validations/process-request.compliance.validation";

const logger = createServiceLogger("processRequest");

/**
 * Map action to new status
 */
function getNewStatusForAction(
	action: string,
	currentStatus: string,
): string | null {
	switch (action) {
		case "approve":
			if (currentStatus === DataSubjectRequestStatus.PENDING) {
				return DataSubjectRequestStatus.PROCESSING;
			}
			if (currentStatus === DataSubjectRequestStatus.PENDING_VERIFICATION) {
				return DataSubjectRequestStatus.VERIFIED;
			}
			return DataSubjectRequestStatus.PROCESSING;

		case "reject":
			return DataSubjectRequestStatus.CANCELLED;

		case "expedite":
			if (
				currentStatus === DataSubjectRequestStatus.PENDING ||
				currentStatus === DataSubjectRequestStatus.PROCESSING
			) {
				return DataSubjectRequestStatus.PROCESSING;
			}
			if (currentStatus === DataSubjectRequestStatus.VERIFIED) {
				// For expedite on verified deletion request, move to processing
				return DataSubjectRequestStatus.PROCESSING;
			}
			return null;

		default:
			return null;
	}
}

export async function processRequestService({
	tenantId,
	adminId,
	requestId,
	action,
	notes,
}: {
	tenantId: string;
	adminId: string;
} & ProcessRequestInput["params"] &
	ProcessRequestInput["body"]): Promise<ProcessRequestOutput> {
	logger.info(
		{ tenantId, requestId, action },
		"Processing data subject request",
	);

	// Find the request
	const request = await findDataSubjectRequestById({ tenantId, requestId });

	if (!request) {
		throw new NotFoundError(
			"Data subject request not found",
			ComplianceErrorCodes.REQUEST_NOT_FOUND,
		);
	}

	// Check if request is in a processable state
	const nonProcessableStatuses = [
		DataSubjectRequestStatus.COMPLETED,
		DataSubjectRequestStatus.CANCELLED,
		DataSubjectRequestStatus.EXPIRED,
		DataSubjectRequestStatus.FAILED,
	];

	if (
		nonProcessableStatuses.includes(
			request.status as (typeof nonProcessableStatuses)[number],
		)
	) {
		throw new BadRequestError(
			`Request cannot be processed in ${request.status} status`,
			ComplianceErrorCodes.INVALID_REQUEST,
		);
	}

	// Determine new status based on action
	const newStatus = getNewStatusForAction(action, request.status);

	if (!newStatus) {
		throw new BadRequestError(
			`Action '${action}' is not valid for current status '${request.status}'`,
			ComplianceErrorCodes.INVALID_REQUEST,
		);
	}

	// Update the request
	const updated = await updateRequestWithAdminAction({
		requestId,
		tenantId,
		adminId,
		action,
		notes,
		newStatus,
	});

	if (!updated) {
		throw new NotFoundError(
			"Failed to update data subject request",
			ComplianceErrorCodes.REQUEST_NOT_FOUND,
		);
	}

	const result: ProcessRequestOutput = {
		requestId: updated._id,
		status: updated.status,
		processedBy: adminId,
		processedAt: updated.processedAt
			? updated.processedAt.toISOString()
			: new Date().toISOString(),
	};

	logSuccess(logger, { requestId, action }, `Request ${action}ed successfully`);

	return result;
}
