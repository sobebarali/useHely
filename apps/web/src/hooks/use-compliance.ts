/**
 * React hooks for compliance client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	complianceClient,
	type ListComplianceRequestsParams,
	type ProcessRequestInput,
	type RecordConsentInput,
	type RequestDataDeletionInput,
	type RequestDataExportInput,
} from "../lib/compliance-client";

// Query keys
export const complianceKeys = {
	all: ["compliance"] as const,
	// Consent
	consents: () => [...complianceKeys.all, "consents"] as const,
	consentHistory: (purpose: string) =>
		[...complianceKeys.all, "consent-history", purpose] as const,
	// Export
	exports: () => [...complianceKeys.all, "exports"] as const,
	exportStatus: (requestId: string) =>
		[...complianceKeys.exports(), requestId] as const,
	// Deletion
	deletions: () => [...complianceKeys.all, "deletions"] as const,
	deletionStatus: (requestId: string) =>
		[...complianceKeys.deletions(), requestId] as const,
	// Admin
	adminRequests: () => [...complianceKeys.all, "admin-requests"] as const,
	adminRequestList: (params: ListComplianceRequestsParams) =>
		[...complianceKeys.adminRequests(), params] as const,
};

// ===== Consent Management Hooks =====

/**
 * Hook to list all consent records
 */
export function useConsents() {
	return useQuery({
		queryKey: complianceKeys.consents(),
		queryFn: () => complianceClient.listConsents(),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Hook to get consent history for a specific purpose
 */
export function useConsentHistory(purpose: string, enabled = true) {
	return useQuery({
		queryKey: complianceKeys.consentHistory(purpose),
		queryFn: () =>
			complianceClient.getConsentHistory(
				purpose as Parameters<typeof complianceClient.getConsentHistory>[0],
			),
		enabled: !!purpose && enabled,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Hook for recording a consent
 */
export function useRecordConsent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: RecordConsentInput) =>
			complianceClient.recordConsent(input),
		onSuccess: () => {
			// Invalidate consents list to refetch
			queryClient.invalidateQueries({ queryKey: complianceKeys.consents() });
		},
	});
}

/**
 * Hook for withdrawing a consent
 */
export function useWithdrawConsent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (consentId: string) =>
			complianceClient.withdrawConsent(consentId),
		onSuccess: () => {
			// Invalidate consents list to refetch
			queryClient.invalidateQueries({ queryKey: complianceKeys.consents() });
		},
	});
}

// ===== Data Export Hooks =====

/**
 * Hook for requesting data export
 */
export function useRequestDataExport() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: RequestDataExportInput) =>
			complianceClient.requestDataExport(input),
		onSuccess: () => {
			// Invalidate exports list
			queryClient.invalidateQueries({ queryKey: complianceKeys.exports() });
		},
	});
}

/**
 * Hook to get export status
 */
export function useExportStatus(requestId: string, enabled = true) {
	return useQuery({
		queryKey: complianceKeys.exportStatus(requestId),
		queryFn: () => complianceClient.getExportStatus(requestId),
		enabled: !!requestId && enabled,
		refetchInterval: (query) => {
			const data = query.state.data;
			// Poll every 5 seconds if status is pending or processing
			if (data?.status === "pending" || data?.status === "processing") {
				return 5000;
			}
			return false;
		},
		staleTime: 1000 * 30, // 30 seconds
	});
}

/**
 * Hook for downloading data export
 */
export function useDownloadExport() {
	return useMutation({
		mutationFn: (requestId: string) =>
			complianceClient.downloadExport(requestId),
	});
}

// ===== Data Deletion Hooks =====

/**
 * Hook for requesting data deletion
 */
export function useRequestDataDeletion() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: RequestDataDeletionInput) =>
			complianceClient.requestDataDeletion(input),
		onSuccess: () => {
			// Invalidate deletions list
			queryClient.invalidateQueries({ queryKey: complianceKeys.deletions() });
		},
	});
}

/**
 * Hook to get deletion status
 */
export function useDeletionStatus(requestId: string, enabled = true) {
	return useQuery({
		queryKey: complianceKeys.deletionStatus(requestId),
		queryFn: () => complianceClient.getDeletionStatus(requestId),
		enabled: !!requestId && enabled,
		refetchInterval: (query) => {
			const data = query.state.data;
			// Poll every 5 seconds if status is pending or verified
			if (
				data?.status === "pending_verification" ||
				data?.status === "verified"
			) {
				return 5000;
			}
			return false;
		},
		staleTime: 1000 * 30, // 30 seconds
	});
}

/**
 * Hook for verifying deletion request
 */
export function useVerifyDeletion() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ requestId, token }: { requestId: string; token: string }) =>
			complianceClient.verifyDeletion({ requestId, token }),
		onSuccess: (_, variables) => {
			// Invalidate deletion status
			queryClient.invalidateQueries({
				queryKey: complianceKeys.deletionStatus(variables.requestId),
			});
		},
	});
}

/**
 * Hook for cancelling deletion request
 */
export function useCancelDeletion() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (requestId: string) =>
			complianceClient.cancelDeletion(requestId),
		onSuccess: (_, requestId) => {
			// Invalidate deletion status
			queryClient.invalidateQueries({
				queryKey: complianceKeys.deletionStatus(requestId),
			});
		},
	});
}

// ===== Admin Hooks =====

/**
 * Hook to list compliance requests (admin only)
 */
export function useComplianceRequests(
	params: ListComplianceRequestsParams = {},
) {
	return useQuery({
		queryKey: complianceKeys.adminRequestList(params),
		queryFn: () => complianceClient.listComplianceRequests(params),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook for processing a compliance request (admin only)
 */
export function useProcessRequest() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			requestId,
			data,
		}: {
			requestId: string;
			data: ProcessRequestInput;
		}) => complianceClient.processRequest({ requestId, data }),
		onSuccess: () => {
			// Invalidate admin requests list
			queryClient.invalidateQueries({
				queryKey: complianceKeys.adminRequests(),
			});
		},
	});
}

// Re-export types for convenience
export type {
	AdminRequestAction,
	CancelDeletionResponse,
	ComplianceRequestListItem,
	ConsentHistoryEntry,
	ConsentHistoryResponse,
	ConsentPurpose,
	ConsentRecord,
	ConsentSource,
	DeletionStatus,
	DeletionStatusResponse,
	ExportFormat,
	ExportStatus,
	ExportStatusResponse,
	ListComplianceRequestsParams,
	ListComplianceRequestsResponse,
	ProcessRequestInput,
	ProcessRequestResponse,
	RecordConsentInput,
	RecordConsentResponse,
	RequestDataDeletionInput,
	RequestDataDeletionResponse,
	RequestDataExportInput,
	RequestDataExportResponse,
	RequestType,
	VerifyDeletionInput,
	VerifyDeletionResponse,
	WithdrawConsentResponse,
} from "../lib/compliance-client";
