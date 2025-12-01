/**
 * Reports API Client
 *
 * This client interfaces with the /api/reports/* endpoints on the server.
 */

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "";

// Token storage keys
const ACCESS_TOKEN_KEY = "hms_access_token";
const REFRESH_TOKEN_KEY = "hms_refresh_token";
const TOKEN_EXPIRY_KEY = "hms_token_expiry";

// Types
export type ReportType =
	| "patient-registration"
	| "patient-demographics"
	| "appointment-summary"
	| "doctor-performance"
	| "prescription-summary"
	| "medicine-usage"
	| "department-utilization"
	| "staff-summary";

export type ReportCategory =
	| "PATIENT"
	| "APPOINTMENT"
	| "PRESCRIPTION"
	| "OPERATIONAL";
export type ReportFormat = "json" | "csv" | "pdf" | "xlsx";
export type ReportStatus = "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";

export interface ReportParameter {
	name: string;
	type: string;
	required: boolean;
	description: string;
}

export interface AvailableReport {
	id: string;
	name: string;
	description: string;
	category: ReportCategory;
	parameters: ReportParameter[];
	formats: ReportFormat[];
	requiredPermission: string;
}

export interface GenerateReportInput {
	reportType: ReportType;
	format?: ReportFormat;
	parameters: {
		startDate?: string;
		endDate?: string;
		departmentId?: string;
		doctorId?: string;
		patientType?: "OPD" | "IPD";
		groupBy?: "day" | "week" | "month";
		asOfDate?: string;
		medicineId?: string;
		role?: string;
	};
}

export interface GeneratedReport {
	reportId: string;
	reportType: string;
	generatedAt: string;
	parameters: Record<string, unknown>;
	data: unknown;
	summary: Record<string, unknown>;
}

export interface ReportHistoryItem {
	reportId: string;
	reportType: string;
	parameters: Record<string, unknown>;
	format: string;
	generatedBy: {
		id: string;
		name: string;
	};
	generatedAt: string;
	expiresAt: string;
	status: ReportStatus;
}

export interface ReportHistoryParams {
	page?: number;
	limit?: number;
	reportType?: string;
	startDate?: string;
	endDate?: string;
}

export interface ReportHistoryResponse {
	data: ReportHistoryItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface DownloadReportResponse {
	reportId: string;
	reportType: string;
	format: string;
	data: unknown;
	generatedAt: string;
}

export interface ApiError {
	code: string;
	message: string;
}

// Token management helpers
function getStoredTokens(): {
	accessToken: string | null;
	refreshToken: string | null;
	expiry: number | null;
} {
	return {
		accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
		refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
		expiry: localStorage.getItem(TOKEN_EXPIRY_KEY)
			? Number(localStorage.getItem(TOKEN_EXPIRY_KEY))
			: null,
	};
}

function isTokenExpired(): boolean {
	const { expiry } = getStoredTokens();
	if (!expiry) return true;
	return Date.now() >= expiry - 60000;
}

// API helpers
async function apiRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
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

async function refreshTokens(): Promise<boolean> {
	const { refreshToken } = getStoredTokens();

	if (!refreshToken) {
		return false;
	}

	try {
		const response = await apiRequest<{
			access_token: string;
			token_type: string;
			expires_in: number;
			refresh_token: string;
			refresh_expires_in: number;
		}>("/api/auth/token", {
			method: "POST",
			body: JSON.stringify({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
			}),
		});

		localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
		localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
		localStorage.setItem(
			TOKEN_EXPIRY_KEY,
			String(Date.now() + response.expires_in * 1000),
		);
		return true;
	} catch {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
		localStorage.removeItem(TOKEN_EXPIRY_KEY);
		return false;
	}
}

async function authenticatedRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
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

	return apiRequest<T>(endpoint, {
		...options,
		headers: {
			...options.headers,
			Authorization: `Bearer ${accessToken}`,
		},
	});
}

// ===== Reports API Functions =====

/**
 * List available report types
 */
export async function listReportTypes(): Promise<{
	reports: AvailableReport[];
}> {
	return authenticatedRequest<{ reports: AvailableReport[] }>("/api/reports");
}

/**
 * Generate a new report
 */
export async function generateReport(
	input: GenerateReportInput,
): Promise<GeneratedReport> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: GeneratedReport;
	}>("/api/reports/generate", {
		method: "POST",
		body: JSON.stringify(input),
	});
	return response.data;
}

/**
 * Get report generation history
 */
export async function getReportHistory(
	params: ReportHistoryParams = {},
): Promise<ReportHistoryResponse> {
	const searchParams = new URLSearchParams();

	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.reportType) searchParams.set("reportType", params.reportType);
	if (params.startDate) searchParams.set("startDate", params.startDate);
	if (params.endDate) searchParams.set("endDate", params.endDate);

	const queryString = searchParams.toString();
	const endpoint = `/api/reports/history${queryString ? `?${queryString}` : ""}`;

	const response = await authenticatedRequest<{
		success: boolean;
		data: ReportHistoryItem[];
		pagination: ReportHistoryResponse["pagination"];
	}>(endpoint);

	return {
		data: response.data,
		pagination: response.pagination,
	};
}

/**
 * Download a generated report
 */
export async function downloadReport(
	reportId: string,
): Promise<DownloadReportResponse> {
	const response = await authenticatedRequest<{
		success: boolean;
		data: DownloadReportResponse;
	}>(`/api/reports/${reportId}/download`);
	return response.data;
}

// Reports client object for convenience
export const reportsClient = {
	listReportTypes,
	generateReport,
	getReportHistory,
	downloadReport,
};

export default reportsClient;
