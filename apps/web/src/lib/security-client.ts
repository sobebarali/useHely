/**
 * Security API Client
 *
 * This client interfaces with the security management API endpoints
 * at /api/security/* on the server.
 */

import { authClient } from "./auth-client";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

// Types
export interface ApiError {
	code: string;
	message: string;
}

// Security Event Types
export type SecurityEventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SecurityEventType =
	| "AUTH_FAILED"
	| "AUTH_LOCKOUT"
	| "PERMISSION_DENIED"
	| "MFA_FAILED"
	| "MFA_ENABLED"
	| "MFA_DISABLED"
	| "SUSPICIOUS_ACTIVITY"
	| "KEY_ROTATION"
	| "ADMIN_ACTION";

export interface SecurityEvent {
	id: string | null;
	type: SecurityEventType;
	severity: SecurityEventSeverity;
	tenantId?: string | null;
	userId?: string | null;
	ip?: string | null;
	userAgent?: string | null;
	details?: Record<string, unknown>;
	timestamp: string;
}

export interface ListSecurityEventsParams {
	page?: number;
	limit?: number;
	severity?: SecurityEventSeverity;
	type?: SecurityEventType;
	userId?: string;
	tenantId?: string;
	startDate?: string;
	endDate?: string;
}

export interface ListSecurityEventsResponse {
	events: SecurityEvent[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export interface KeyStatus {
	currentKeyId: string;
	lastRotation: {
		rotatedAt: string;
		rotatedBy: string;
		recordsReEncrypted: number;
		daysSinceRotation: number;
	} | null;
	rotationRecommended: boolean;
	totalRotations: number;
}

export interface RotateKeysResponse {
	success: boolean;
	newKeyId: string;
	recordsReEncrypted: number;
	rotatedAt: string;
}

// API helpers
async function authenticatedRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const accessToken = authClient.getAccessToken();

	if (!accessToken) {
		throw { code: "UNAUTHORIZED", message: "Not authenticated" } as ApiError;
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
			...options.headers,
		},
	});

	const data = await response.json();

	if (!response.ok) {
		throw {
			code: data.code || "UNKNOWN_ERROR",
			message: data.message || "An error occurred",
		} as ApiError;
	}

	return data;
}

// Security Events API
export async function listSecurityEvents(
	params: ListSecurityEventsParams = {},
): Promise<ListSecurityEventsResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", params.page.toString());
	if (params.limit) searchParams.set("limit", params.limit.toString());
	if (params.severity) searchParams.set("severity", params.severity);
	if (params.type) searchParams.set("type", params.type);
	if (params.userId) searchParams.set("userId", params.userId);
	if (params.tenantId) searchParams.set("tenantId", params.tenantId);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);

	const queryString = searchParams.toString();
	const endpoint = `/api/security/events${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ListSecurityEventsResponse;
	}>(endpoint);

	return response.data;
}

export async function getSecurityEvent(id: string): Promise<SecurityEvent> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: SecurityEvent;
	}>(`/api/security/events/${id}`);

	return response.data;
}

// Key Management API
export async function getKeyStatus(): Promise<KeyStatus> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: KeyStatus;
	}>("/api/security/keys/status");

	return response.data;
}

export async function rotateKeys(): Promise<RotateKeysResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: RotateKeysResponse;
	}>("/api/security/keys/rotate", {
		method: "POST",
	});

	return response.data;
}

// Security client object
export const securityClient = {
	listSecurityEvents,
	getSecurityEvent,
	getKeyStatus,
	rotateKeys,
};

export default securityClient;
