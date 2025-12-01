/**
 * Request Deletion Repository
 *
 * Database operations for data deletion requests
 */

import {
	DataSubjectRequest,
	DataSubjectRequestStatus,
	DataSubjectRequestType,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { createRepositoryLogger, logDatabaseOperation } from "@/lib/logger";
import { generateSecureToken, hashToken } from "@/utils/crypto";
import {
	DELETION_GRACE_PERIOD_DAYS,
	VERIFICATION_TOKEN_EXPIRY_HOURS,
} from "../compliance.constants";
import type { RequestDeletionInput } from "../validations/request-deletion.compliance.validation";
import type { DataSubjectRequestDocument } from "./shared.compliance.repository";

const logger = createRepositoryLogger("requestDeletion");

/** Pending statuses that block new requests */
const PENDING_STATUSES = [
	DataSubjectRequestStatus.PENDING,
	DataSubjectRequestStatus.PENDING_VERIFICATION,
	DataSubjectRequestStatus.VERIFIED,
	DataSubjectRequestStatus.PROCESSING,
];

export interface DeletionRequestWithToken extends DataSubjectRequestDocument {
	/** Plain text token to send to user (not stored in DB) */
	plainTextToken: string;
}

export interface CreateDeletionResult {
	request: DeletionRequestWithToken;
	alreadyExists: boolean;
}

/**
 * Atomically check for existing pending requests and create a new deletion request.
 *
 * Uses a two-step process with race condition handling:
 * 1. Check if pending request exists
 * 2. Create new request
 * 3. Handle duplicate key errors gracefully
 *
 * Returns `alreadyExists: true` if a pending request already exists.
 */
export async function createDeletionRequestAtomic({
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
} & RequestDeletionInput): Promise<CreateDeletionResult> {
	const requestId = uuidv4();

	// Generate token and hash it for storage
	const plainTextToken = generateSecureToken();
	const hashedToken = hashToken(plainTextToken);

	// Set verification token expiry
	const verificationTokenExpiry = new Date();
	verificationTokenExpiry.setHours(
		verificationTokenExpiry.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS,
	);

	logger.debug({ tenantId, userId }, "Creating deletion request atomically");

	try {
		// First check for existing pending request
		const existingRequest = await DataSubjectRequest.findOne({
			tenantId,
			userId,
			type: DataSubjectRequestType.DELETION,
			status: { $in: PENDING_STATUSES },
		}).lean<DataSubjectRequestDocument>();

		if (existingRequest) {
			return {
				request: { ...existingRequest, plainTextToken: "" },
				alreadyExists: true,
			};
		}

		// Create new request
		await DataSubjectRequest.create({
			_id: requestId,
			tenantId,
			userId,
			userEmail,
			type: DataSubjectRequestType.DELETION,
			status: DataSubjectRequestStatus.PENDING_VERIFICATION,
			reason,
			confirmEmail,
			verificationToken: hashedToken,
			verificationTokenExpiry,
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
			{ _id: requestId, type: "DELETION" },
		);

		if (!request) {
			throw new Error("Failed to create deletion request");
		}

		return {
			request: { ...request, plainTextToken },
			alreadyExists: false,
		};
	} catch (error) {
		// Handle race condition: if another request was created concurrently,
		// MongoDB may throw a duplicate key error or we may now find an existing one
		if (
			error instanceof Error &&
			(error.message.includes("duplicate key") ||
				error.message.includes("E11000"))
		) {
			const existingRequest = await DataSubjectRequest.findOne({
				tenantId,
				userId,
				type: DataSubjectRequestType.DELETION,
				status: { $in: PENDING_STATUSES },
			}).lean<DataSubjectRequestDocument>();

			if (existingRequest) {
				return {
					request: { ...existingRequest, plainTextToken: "" },
					alreadyExists: true,
				};
			}
		}
		throw error;
	}
}

/**
 * Create a new data deletion request
 *
 * Returns the request with the plain text token that should be sent to the user.
 * The token stored in the database is hashed for security.
 */
export async function createDeletionRequest({
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
} & RequestDeletionInput): Promise<DeletionRequestWithToken> {
	const requestId = uuidv4();

	// Generate token and hash it for storage
	const plainTextToken = generateSecureToken();
	const hashedToken = hashToken(plainTextToken);

	// Set verification token expiry
	const verificationTokenExpiry = new Date();
	verificationTokenExpiry.setHours(
		verificationTokenExpiry.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS,
	);

	logger.debug({ tenantId, userId }, "Creating deletion request");

	await DataSubjectRequest.create({
		_id: requestId,
		tenantId,
		userId,
		userEmail,
		type: DataSubjectRequestType.DELETION,
		status: DataSubjectRequestStatus.PENDING_VERIFICATION,
		reason,
		confirmEmail,
		verificationToken: hashedToken, // Store hashed token
		verificationTokenExpiry,
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
		{ _id: requestId, type: "DELETION" },
	);

	if (!request) {
		throw new Error("Failed to create deletion request");
	}

	// Return request with plain text token (for sending via email)
	return {
		...request,
		plainTextToken,
	};
}

/**
 * Verify deletion request and schedule deletion
 */
export async function verifyDeletionRequest({
	requestId,
	tenantId,
}: {
	requestId: string;
	tenantId: string;
}): Promise<DataSubjectRequestDocument | null> {
	const now = new Date();

	// Calculate grace period end and scheduled deletion
	const gracePeriodEnds = new Date();
	gracePeriodEnds.setDate(
		gracePeriodEnds.getDate() + DELETION_GRACE_PERIOD_DAYS,
	);

	logger.debug({ requestId, tenantId }, "Verifying deletion request");

	const updated = await DataSubjectRequest.findOneAndUpdate(
		{ _id: requestId, tenantId },
		{
			$set: {
				status: DataSubjectRequestStatus.VERIFIED,
				verifiedAt: now,
				scheduledAt: gracePeriodEnds,
				gracePeriodEnds,
				verificationToken: null,
				verificationTokenExpiry: null,
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
			{ status: "VERIFIED", scheduledAt: gracePeriodEnds },
		);
	}

	return updated;
}

/**
 * Cancel deletion request
 */
export async function cancelDeletionRequest({
	requestId,
	tenantId,
}: {
	requestId: string;
	tenantId: string;
}): Promise<DataSubjectRequestDocument | null> {
	const now = new Date();

	logger.debug({ requestId, tenantId }, "Cancelling deletion request");

	const updated = await DataSubjectRequest.findOneAndUpdate(
		{ _id: requestId, tenantId },
		{
			$set: {
				status: DataSubjectRequestStatus.CANCELLED,
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
			{ status: "CANCELLED" },
		);
	}

	return updated;
}

/**
 * Mark verification as expired
 */
export async function markVerificationExpired({
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
				status: DataSubjectRequestStatus.VERIFICATION_EXPIRED,
				verificationToken: null,
				verificationTokenExpiry: null,
				updatedAt: now,
			},
		},
		{ new: true },
	).lean<DataSubjectRequestDocument>();

	return updated;
}
