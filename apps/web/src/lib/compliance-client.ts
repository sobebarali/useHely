/**
 * Compliance API Client for useHely
 *
 * This client interfaces with the /api/compliance/* endpoints on the server.
 * Provides GDPR compliance features including data export, data deletion, and consent management.
 */

import {
	type ApiError,
	authenticatedRequest,
	getStoredTokens,
	isTokenExpired,
	refreshTokens,
} from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

// ===== Types =====

// Export types
export type ExportFormat = "json" | "csv";
export type ExportStatus =
	| "pending"
	| "processing"
	| "completed"
	| "expired"
	| "failed";

export interface RequestDataExportInput {
	format?: ExportFormat;
	includeAuditLog?: boolean;
}

export interface RequestDataExportResponse {
	requestId: string;
	type: "EXPORT";
	status: string;
	format: ExportFormat;
	createdAt: string;
	estimatedCompletion?: string;
}

export interface ExportStatusResponse {
	requestId: string;
	type: "EXPORT";
	status: ExportStatus;
	format: ExportFormat;
	createdAt: string;
	completedAt?: string;
	downloadUrl?: string;
	expiresAt?: string;
	fileSize?: number;
}

// Deletion types
export type DeletionStatus =
	| "pending_verification"
	| "verification_expired"
	| "verified"
	| "pending_deletion"
	| "completed"
	| "cancelled";

export interface RequestDataDeletionInput {
	reason?: string;
	confirmEmail: string;
}

export interface RequestDataDeletionResponse {
	requestId: string;
	type: "DELETION";
	status: string;
	createdAt: string;
	message: string;
}

export interface VerifyDeletionInput {
	token: string;
}

export interface VerifyDeletionResponse {
	requestId: string;
	status: string;
	gracePeriodEnds: string;
	message: string;
}

export interface DeletionStatusResponse {
	requestId: string;
	type: "DELETION";
	status: DeletionStatus;
	createdAt: string;
	verifiedAt?: string;
	gracePeriodEnds?: string;
	completedAt?: string;
	canCancel: boolean;
}

export interface CancelDeletionResponse {
	requestId: string;
	status: string;
	cancelledAt: string;
	message: string;
}

// Consent types
export type ConsentPurpose =
	| "terms_of_service"
	| "privacy_policy"
	| "marketing_emails"
	| "sms_notifications"
	| "analytics"
	| "third_party_sharing";

export type ConsentSource = "registration" | "settings" | "prompt" | "api";

export interface ConsentRecord {
	id: string;
	purpose: ConsentPurpose;
	purposeName: string;
	granted: boolean;
	source: ConsentSource;
	grantedAt?: string;
	withdrawnAt?: string;
	required: boolean;
	description: string;
}

export interface RecordConsentInput {
	purpose: ConsentPurpose;
	granted: boolean;
	source?: ConsentSource;
}

export interface RecordConsentResponse {
	id: string;
	purpose: ConsentPurpose;
	granted: boolean;
	grantedAt?: string;
	message: string;
}

export interface WithdrawConsentResponse {
	id: string;
	purpose: ConsentPurpose;
	withdrawnAt: string;
	message: string;
}

export interface ConsentHistoryEntry {
	id: string;
	action: "GRANTED" | "WITHDRAWN";
	source: ConsentSource;
	ipAddress: string;
	userAgent: string;
	timestamp: string;
}

export interface ConsentHistoryResponse {
	purpose: ConsentPurpose;
	purposeName: string;
	currentStatus: boolean;
	history: ConsentHistoryEntry[];
}

// Admin types
export type RequestType = "EXPORT" | "DELETION";
export type AdminRequestAction = "approve" | "reject" | "expedite";

export interface ListComplianceRequestsParams {
	page?: number;
	limit?: number;
	type?: RequestType | "all";
	status?: string;
	startDate?: string;
	endDate?: string;
}

export interface ComplianceRequestListItem {
	requestId: string;
	userId: string;
	userName: string;
	userEmail: string;
	type: RequestType;
	status: string;
	createdAt: string;
	completedAt?: string;
	adminNotes?: string;
}

export interface ListComplianceRequestsResponse {
	data: ComplianceRequestListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ProcessRequestInput {
	action: AdminRequestAction;
	notes?: string;
}

export interface ProcessRequestResponse {
	requestId: string;
	status: string;
	processedAt: string;
	message: string;
}

// ===== Data Export Functions =====

/**
 * Request export of all personal data (GDPR Article 15 - Right of Access)
 */
export async function requestDataExport(
	input: RequestDataExportInput = {},
): Promise<RequestDataExportResponse> {
	return authenticatedRequest<RequestDataExportResponse>(
		"/api/compliance/data-export",
		{
			method: "POST",
			body: JSON.stringify(input),
		},
	);
}

/**
 * Get status of a data export request
 */
export async function getExportStatus(
	requestId: string,
): Promise<ExportStatusResponse> {
	return authenticatedRequest<ExportStatusResponse>(
		`/api/compliance/data-export/${requestId}`,
	);
}

/**
 * Download exported data file
 * Returns a Blob that can be saved to disk
 */
export async function downloadExport(requestId: string): Promise<Blob> {
	let { accessToken } = getStoredTokens();

	// Try to refresh if token is expired
	if (isTokenExpired()) {
		const refreshed = await refreshTokens();
		if (!refreshed) {
			throw { code: "UNAUTHORIZED", message: "Session expired" } as ApiError;
		}
		accessToken = getStoredTokens().accessToken;
	}

	if (!accessToken) {
		throw { code: "UNAUTHORIZED", message: "Not authenticated" } as ApiError;
	}

	const endpoint = `/api/compliance/data-export/${requestId}/download`;
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const data = await response.json();
		throw {
			code: data.code || "UNKNOWN_ERROR",
			message: data.message || "Failed to download export",
		} as ApiError;
	}

	return response.blob();
}

// ===== Data Deletion Functions =====

/**
 * Request deletion of all personal data (GDPR Article 17 - Right to Erasure)
 * Rate limited: 3 requests per day
 */
export async function requestDataDeletion(
	input: RequestDataDeletionInput,
): Promise<RequestDataDeletionResponse> {
	return authenticatedRequest<RequestDataDeletionResponse>(
		"/api/compliance/data-deletion",
		{
			method: "POST",
			body: JSON.stringify(input),
		},
	);
}

/**
 * Verify data deletion request with token from email
 * Rate limited: 5 attempts per hour
 */
export async function verifyDeletion({
	requestId,
	token,
}: {
	requestId: string;
	token: string;
}): Promise<VerifyDeletionResponse> {
	return authenticatedRequest<VerifyDeletionResponse>(
		`/api/compliance/data-deletion/${requestId}/verify`,
		{
			method: "POST",
			body: JSON.stringify({ token }),
		},
	);
}

/**
 * Cancel a deletion request during grace period (30 days)
 */
export async function cancelDeletion(
	requestId: string,
): Promise<CancelDeletionResponse> {
	return authenticatedRequest<CancelDeletionResponse>(
		`/api/compliance/data-deletion/${requestId}/cancel`,
		{
			method: "POST",
		},
	);
}

/**
 * Get status of a data deletion request
 */
export async function getDeletionStatus(
	requestId: string,
): Promise<DeletionStatusResponse> {
	return authenticatedRequest<DeletionStatusResponse>(
		`/api/compliance/data-deletion/${requestId}`,
	);
}

// ===== Consent Management Functions =====

/**
 * List all consent records for the authenticated user
 */
export async function listConsents(): Promise<ConsentRecord[]> {
	return authenticatedRequest<ConsentRecord[]>("/api/compliance/consent");
}

/**
 * Record or update a consent
 */
export async function recordConsent(
	input: RecordConsentInput,
): Promise<RecordConsentResponse> {
	return authenticatedRequest<RecordConsentResponse>(
		"/api/compliance/consent",
		{
			method: "POST",
			body: JSON.stringify(input),
		},
	);
}

/**
 * Withdraw a previously granted consent
 */
export async function withdrawConsent(
	consentId: string,
): Promise<WithdrawConsentResponse> {
	return authenticatedRequest<WithdrawConsentResponse>(
		`/api/compliance/consent/${consentId}/withdraw`,
		{
			method: "PUT",
		},
	);
}

/**
 * Get consent history for a specific purpose
 */
export async function getConsentHistory(
	purpose: ConsentPurpose,
): Promise<ConsentHistoryResponse> {
	return authenticatedRequest<ConsentHistoryResponse>(
		`/api/compliance/consent/${purpose}/history`,
	);
}

// ===== Admin Functions =====

/**
 * List all compliance requests (admin only)
 * Requires COMPLIANCE:READ permission
 */
export async function listComplianceRequests(
	params: ListComplianceRequestsParams = {},
): Promise<ListComplianceRequestsResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.type && params.type !== "all")
		searchParams.set("type", params.type);
	if (params.status) searchParams.set("status", params.status);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);

	const queryString = searchParams.toString();
	const endpoint = `/api/compliance/requests${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListComplianceRequestsResponse["data"];
		pagination: ListComplianceRequestsResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Process a compliance request (admin only)
 * Requires COMPLIANCE:MANAGE permission
 */
export async function processRequest({
	requestId,
	data,
}: {
	requestId: string;
	data: ProcessRequestInput;
}): Promise<ProcessRequestResponse> {
	return authenticatedRequest<ProcessRequestResponse>(
		`/api/compliance/requests/${requestId}/process`,
		{
			method: "PUT",
			body: JSON.stringify(data),
		},
	);
}

// Compliance client object for convenience
export const complianceClient = {
	// Data Export
	requestDataExport,
	getExportStatus,
	downloadExport,
	// Data Deletion
	requestDataDeletion,
	verifyDeletion,
	cancelDeletion,
	getDeletionStatus,
	// Consent Management
	listConsents,
	recordConsent,
	withdrawConsent,
	getConsentHistory,
	// Admin
	listComplianceRequests,
	processRequest,
};

export default complianceClient;
