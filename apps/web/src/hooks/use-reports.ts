/**
 * React hooks for reports client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type GenerateReportInput,
	type ReportHistoryParams,
	reportsClient,
} from "../lib/reports-client";

// Query keys
export const reportsKeys = {
	all: ["reports"] as const,
	types: () => [...reportsKeys.all, "types"] as const,
	history: () => [...reportsKeys.all, "history"] as const,
	historyList: (params: ReportHistoryParams) =>
		[...reportsKeys.history(), params] as const,
	details: () => [...reportsKeys.all, "detail"] as const,
	detail: (id: string) => [...reportsKeys.details(), id] as const,
};

/**
 * Hook to list available report types
 */
export function useReportTypes() {
	return useQuery({
		queryKey: reportsKeys.types(),
		queryFn: () => reportsClient.listReportTypes(),
		staleTime: 1000 * 60 * 10, // 10 minutes - report types rarely change
	});
}

/**
 * Hook to get report generation history
 */
export function useReportHistory(params: ReportHistoryParams = {}) {
	return useQuery({
		queryKey: reportsKeys.historyList(params),
		queryFn: () => reportsClient.getReportHistory(params),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook to get a specific report by ID
 */
export function useReport(reportId: string) {
	return useQuery({
		queryKey: reportsKeys.detail(reportId),
		queryFn: () => reportsClient.downloadReport(reportId),
		enabled: !!reportId,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Helper function to download report as a file
 */
export async function downloadReportAsFile(
	reportId: string,
	filename?: string,
): Promise<void> {
	const response = await reportsClient.downloadReport(reportId);

	// Determine the file extension and MIME type based on format
	const formatConfig: Record<string, { ext: string; mime: string }> = {
		json: { ext: "json", mime: "application/json" },
		csv: { ext: "csv", mime: "text/csv" },
		pdf: { ext: "pdf", mime: "application/pdf" },
		xlsx: {
			ext: "xlsx",
			mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		},
	};

	const format = response.format?.toLowerCase() || "json";
	const config = formatConfig[format] || formatConfig.json;

	// Convert data to appropriate format
	let blobData: BlobPart;
	if (format === "json") {
		blobData = JSON.stringify(response.data, null, 2);
	} else if (typeof response.data === "string") {
		blobData = response.data;
	} else {
		blobData = JSON.stringify(response.data);
	}

	const blob = new Blob([blobData], { type: config.mime });
	const url = URL.createObjectURL(blob);

	// Create download link
	const link = document.createElement("a");
	link.href = url;
	link.download =
		filename ||
		`${response.reportType}-${new Date(response.generatedAt).toISOString().split("T")[0]}.${config.ext}`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	// Cleanup
	URL.revokeObjectURL(url);
}

/**
 * Hook for generating a new report
 */
export function useGenerateReport() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: GenerateReportInput) =>
			reportsClient.generateReport(input),
		onSuccess: () => {
			// Invalidate report history to show the new report
			queryClient.invalidateQueries({ queryKey: reportsKeys.history() });
		},
	});
}

// Re-export types for convenience
export type {
	ApiError,
	AvailableReport,
	DownloadReportResponse,
	GeneratedReport,
	GenerateReportInput,
	ReportCategory,
	ReportFormat,
	ReportHistoryItem,
	ReportHistoryParams,
	ReportHistoryResponse,
	ReportParameter,
	ReportStatus,
	ReportType,
} from "../lib/reports-client";
