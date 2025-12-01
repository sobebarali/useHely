/**
 * Shared Compliance Repository
 *
 * Reusable database lookups for compliance domain
 */

import {
	Consent,
	type ConsentPurposeValue,
	DataSubjectRequest,
	type DataSubjectRequestTypeValue,
} from "@hms/db";
import { createRepositoryLogger } from "@/lib/logger";

const logger = createRepositoryLogger("sharedCompliance");

// Consent document type
export interface ConsentDocument {
	_id: string;
	tenantId: string;
	userId: string;
	purpose: string;
	description?: string;
	granted: boolean;
	version: string;
	source: string;
	ipAddress?: string;
	userAgent?: string;
	grantedAt?: Date;
	withdrawnAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

// Consent history document type
export interface ConsentHistoryDocument {
	_id: string;
	tenantId: string;
	consentId: string;
	userId: string;
	purpose: string;
	action: string;
	version?: string;
	source: string;
	ipAddress?: string;
	userAgent?: string;
	timestamp: Date;
	previousState?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

// Data subject request document type
export interface DataSubjectRequestDocument {
	_id: string;
	tenantId: string;
	userId: string;
	userEmail: string;
	type: string;
	status: string;
	format?: string;
	includeAuditLog?: boolean;
	reason?: string;
	confirmEmail?: string;
	verificationToken?: string;
	verificationTokenExpiry?: Date;
	verifiedAt?: Date;
	scheduledAt?: Date;
	gracePeriodEnds?: Date;
	completedAt?: Date;
	downloadUrl?: string;
	downloadExpiry?: Date;
	exportData?: Record<string, unknown>;
	processedBy?: string;
	processedAt?: Date;
	adminAction?: string;
	adminNotes?: string;
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Find consent by ID
 */
export async function findConsentById({
	tenantId,
	consentId,
}: {
	tenantId: string;
	consentId: string;
}): Promise<ConsentDocument | null> {
	logger.debug({ tenantId, consentId }, "Finding consent by ID");

	const consent = await Consent.findOne({
		_id: consentId,
		tenantId,
	}).lean<ConsentDocument>();

	return consent;
}

/**
 * Find consent by user and purpose
 */
export async function findConsentByUserAndPurpose({
	tenantId,
	userId,
	purpose,
}: {
	tenantId: string;
	userId: string;
	purpose: ConsentPurposeValue;
}): Promise<ConsentDocument | null> {
	logger.debug(
		{ tenantId, userId, purpose },
		"Finding consent by user and purpose",
	);

	const consent = await Consent.findOne({
		tenantId,
		userId,
		purpose,
	}).lean<ConsentDocument>();

	return consent;
}

/**
 * Find data subject request by ID
 */
export async function findDataSubjectRequestById({
	tenantId,
	requestId,
}: {
	tenantId: string;
	requestId: string;
}): Promise<DataSubjectRequestDocument | null> {
	logger.debug({ tenantId, requestId }, "Finding data subject request by ID");

	const request = await DataSubjectRequest.findOne({
		_id: requestId,
		tenantId,
	}).lean<DataSubjectRequestDocument>();

	return request;
}

/**
 * Find pending data subject request for user
 */
export async function findPendingRequestByUser({
	tenantId,
	userId,
	type,
}: {
	tenantId: string;
	userId: string;
	type: DataSubjectRequestTypeValue;
}): Promise<DataSubjectRequestDocument | null> {
	logger.debug({ tenantId, userId, type }, "Finding pending request by user");

	const request = await DataSubjectRequest.findOne({
		tenantId,
		userId,
		type,
		status: {
			$in: ["PENDING", "PENDING_VERIFICATION", "VERIFIED", "PROCESSING"],
		},
	}).lean<DataSubjectRequestDocument>();

	return request;
}

/**
 * Find data subject request by verification token
 *
 * Note: This includes tenantId for multi-tenant isolation.
 * The token is hashed before comparison for security.
 */
export async function findRequestByVerificationToken({
	tenantId,
	token,
}: {
	tenantId: string;
	token: string;
}): Promise<DataSubjectRequestDocument | null> {
	logger.debug({ tenantId }, "Finding request by verification token");

	const request = await DataSubjectRequest.findOne({
		tenantId,
		verificationToken: token,
	}).lean<DataSubjectRequestDocument>();

	return request;
}
