/**
 * Cancel Deletion Service
 *
 * Business logic for cancelling deletion request during grace period
 */

import { DataSubjectRequestStatus } from "@hms/db";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import {
	ComplianceErrorCodes,
	ComplianceMessages,
} from "../compliance.constants";
import { cancelDeletionRequest } from "../repositories/request-deletion.compliance.repository";
import { findDataSubjectRequestById } from "../repositories/shared.compliance.repository";
import type { CancelDeletionOutput } from "../validations/cancel-deletion.compliance.validation";

const logger = createServiceLogger("cancelDeletion");

export async function cancelDeletionService({
	tenantId,
	userId,
	requestId,
}: {
	tenantId: string;
	userId: string;
	requestId: string;
}): Promise<CancelDeletionOutput> {
	logger.info({ tenantId, requestId }, "Cancelling deletion request");

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
			"You can only cancel your own requests",
			ComplianceErrorCodes.REQUEST_NOT_YOURS,
		);
	}

	// Check if request can be cancelled
	const cancellableStatuses = [
		DataSubjectRequestStatus.PENDING_VERIFICATION,
		DataSubjectRequestStatus.VERIFIED,
	];

	if (
		!cancellableStatuses.includes(
			request.status as (typeof cancellableStatuses)[number],
		)
	) {
		throw new BadRequestError(
			"Request cannot be cancelled at this stage",
			ComplianceErrorCodes.DELETION_CANNOT_CANCEL,
		);
	}

	// Check if within grace period (if verified)
	if (request.status === DataSubjectRequestStatus.VERIFIED) {
		if (
			request.gracePeriodEnds &&
			new Date() > new Date(request.gracePeriodEnds)
		) {
			throw new BadRequestError(
				"Grace period has ended. Deletion cannot be cancelled.",
				ComplianceErrorCodes.DELETION_CANNOT_CANCEL,
			);
		}
	}

	// Cancel the request
	const updated = await cancelDeletionRequest({ requestId, tenantId });

	if (!updated) {
		throw new NotFoundError(
			"Failed to cancel deletion request",
			ComplianceErrorCodes.REQUEST_NOT_FOUND,
		);
	}

	const result: CancelDeletionOutput = {
		requestId: updated._id,
		status: updated.status,
		message: ComplianceMessages.DELETION_CANCELLED,
	};

	logSuccess(
		logger,
		{ requestId: updated._id },
		ComplianceMessages.DELETION_CANCELLED,
	);

	return result;
}
