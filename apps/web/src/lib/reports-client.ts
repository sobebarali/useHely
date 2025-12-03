/**
 * Reports API Client
 *
 * This client interfaces with the /api/reports/* endpoints on the server.
 */

import { authenticatedRequest } from "./api-client";

// Re-export ApiError for backward compatibility
export type { ApiError } from "./api-client";

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
	return authenticatedRequest<GeneratedReport>("/api/reports/generate", {
		method: "POST",
		body: JSON.stringify(input),
	});
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
	return authenticatedRequest<DownloadReportResponse>(
		`/api/reports/${reportId}/download`,
	);
}

// Reports client object for convenience
export const reportsClient = {
	listReportTypes,
	generateReport,
	getReportHistory,
	downloadReport,
};

export default reportsClient;
