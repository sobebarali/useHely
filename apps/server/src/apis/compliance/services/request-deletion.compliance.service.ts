/**
 * Request Deletion Service
 *
 * Business logic for requesting data deletion
 */

import { BadRequestError, ConflictError } from "@/errors";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import {
	ComplianceErrorCodes,
	ComplianceMessages,
} from "../compliance.constants";
import { createDeletionRequestAtomic } from "../repositories/request-deletion.compliance.repository";
import type {
	RequestDeletionInput,
	RequestDeletionOutput,
} from "../validations/request-deletion.compliance.validation";

const logger = createServiceLogger("requestDeletion");

export async function requestDeletionService({
	tenantId,
	userId,
	userEmail,
	reason,
	confirmEmail,
	ipAddress,
	userAgent,
}: {
	tenantId: string;
	userId: string;
	userEmail: string;
	ipAddress?: string;
	userAgent?: string;
} & RequestDeletionInput): Promise<RequestDeletionOutput> {
	logger.info({ tenantId, userId }, "Processing data deletion request");

	// Verify email matches user's email
	if (confirmEmail.toLowerCase() !== userEmail.toLowerCase()) {
		throw new BadRequestError(
			"Email does not match your account email",
			ComplianceErrorCodes.EMAIL_MISMATCH,
		);
	}

	// Atomically check for existing pending request and create new one
	// This prevents race conditions where duplicate requests could be created
	const { request, alreadyExists } = await createDeletionRequestAtomic({
		tenantId,
		userId,
		userEmail,
		reason,
		confirmEmail,
		ipAddress,
		userAgent,
	});

	if (alreadyExists) {
		throw new ConflictError(
			"A data deletion request is already pending",
			ComplianceErrorCodes.DELETION_PENDING,
		);
	}

	// In production, send verification email here
	// await sendVerificationEmail(userEmail, request.plainTextToken);

	const result: RequestDeletionOutput = {
		requestId: request._id,
		type: request.type,
		status: request.status,
		createdAt: request.createdAt.toISOString(),
		message: ComplianceMessages.DELETION_REQUESTED,
	};

	logSuccess(
		logger,
		{ requestId: request._id },
		ComplianceMessages.DELETION_REQUESTED,
	);

	return result;
}
