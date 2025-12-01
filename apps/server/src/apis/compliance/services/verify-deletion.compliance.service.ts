/**
 * Verify Deletion Service
 *
 * Business logic for verifying deletion request via token
 */

import { DataSubjectRequestStatus } from "@hms/db";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import { compareToken } from "@/utils/crypto";
import {
	ComplianceErrorCodes,
	ComplianceMessages,
} from "../compliance.constants";
import { verifyDeletionRequest } from "../repositories/request-deletion.compliance.repository";
import { findDataSubjectRequestById } from "../repositories/shared.compliance.repository";
import type { VerifyDeletionOutput } from "../validations/verify-deletion.compliance.validation";

const logger = createServiceLogger("verifyDeletion");

export async function verifyDeletionService({
	tenantId,
	userId,
	requestId,
	token,
}: {
	tenantId: string;
	userId: string;
	requestId: string;
	token: string;
}): Promise<VerifyDeletionOutput> {
	logger.info({ tenantId, requestId }, "Verifying deletion request");

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
			"You can only verify your own requests",
			ComplianceErrorCodes.REQUEST_NOT_YOURS,
		);
	}

	// Check if already verified
	if (request.status === DataSubjectRequestStatus.VERIFIED) {
		throw new BadRequestError(
			"Request has already been verified",
			ComplianceErrorCodes.DELETION_ALREADY_VERIFIED,
		);
	}

	// Check if request is in correct status
	if (request.status !== DataSubjectRequestStatus.PENDING_VERIFICATION) {
		throw new BadRequestError(
			"Request is not pending verification",
			ComplianceErrorCodes.INVALID_REQUEST,
		);
	}

	// Check if verification token has expired
	if (
		request.verificationTokenExpiry &&
		new Date() > new Date(request.verificationTokenExpiry)
	) {
		throw new BadRequestError(
			"Verification token has expired",
			ComplianceErrorCodes.VERIFICATION_EXPIRED,
		);
	}

	// Verify token using timing-safe comparison against hashed token
	if (
		!request.verificationToken ||
		!compareToken(token, request.verificationToken)
	) {
		throw new BadRequestError(
			"Invalid verification token",
			ComplianceErrorCodes.VERIFICATION_INVALID,
		);
	}

	// Update request to verified status
	const updated = await verifyDeletionRequest({ requestId, tenantId });

	if (!updated) {
		throw new NotFoundError(
			"Failed to update deletion request",
			ComplianceErrorCodes.REQUEST_NOT_FOUND,
		);
	}

	const result: VerifyDeletionOutput = {
		requestId: updated._id,
		status: updated.status,
		scheduledDeletion: updated.scheduledAt
			? updated.scheduledAt.toISOString()
			: new Date().toISOString(),
		message: ComplianceMessages.DELETION_VERIFIED,
	};

	logSuccess(
		logger,
		{ requestId: updated._id },
		ComplianceMessages.DELETION_VERIFIED,
	);

	return result;
}
