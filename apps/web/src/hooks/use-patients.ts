/**
 * React hooks for patients client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ListPatientsParams,
	patientsClient,
	type RegisterPatientInput,
	type SearchPatientsParams,
	type UpdatePatientInput,
} from "../lib/patients-client";

// Query keys
export const patientsKeys = {
	all: ["patients"] as const,
	lists: () => [...patientsKeys.all, "list"] as const,
	list: (params: ListPatientsParams) =>
		[...patientsKeys.lists(), params] as const,
	details: () => [...patientsKeys.all, "detail"] as const,
	detail: (id: string) => [...patientsKeys.details(), id] as const,
	searches: () => [...patientsKeys.all, "search"] as const,
	search: (params: SearchPatientsParams) =>
		[...patientsKeys.searches(), params] as const,
};

/**
 * Hook to list patients with pagination and filters
 */
export function usePatients(params: ListPatientsParams = {}) {
	return useQuery({
		queryKey: patientsKeys.list(params),
		queryFn: () => patientsClient.listPatients(params),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook to get patient by ID
 */
export function usePatient(id: string) {
	return useQuery({
		queryKey: patientsKeys.detail(id),
		queryFn: () => patientsClient.getPatientById(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook to search patients
 */
export function useSearchPatients(params: SearchPatientsParams) {
	return useQuery({
		queryKey: patientsKeys.search(params),
		queryFn: () => patientsClient.searchPatients(params),
		enabled: params.q.length >= 2,
		staleTime: 1000 * 30, // 30 seconds
	});
}

/**
 * Hook for registering a new patient
 */
export function useRegisterPatient() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: RegisterPatientInput) =>
			patientsClient.registerPatient(input),
		onSuccess: () => {
			// Invalidate patients list to refetch
			queryClient.invalidateQueries({ queryKey: patientsKeys.lists() });
		},
	});
}

/**
 * Hook for updating a patient
 */
export function useUpdatePatient() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdatePatientInput }) =>
			patientsClient.updatePatient({ id, data }),
		onSuccess: (_, variables) => {
			// Invalidate specific patient and lists
			queryClient.invalidateQueries({
				queryKey: patientsKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: patientsKeys.lists() });
		},
	});
}

/**
 * Hook for exporting patients
 */
export function useExportPatients() {
	return useMutation({
		mutationFn: patientsClient.exportPatients,
		onSuccess: (blob, variables) => {
			// Create download link
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `patients-export.${variables.format}`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		},
	});
}

// Re-export types for convenience
export type {
	Address,
	BloodGroup,
	EmergencyContact,
	ExportPatientsParams,
	Gender,
	ListPatientsParams,
	ListPatientsResponse,
	PatientDetails,
	PatientListItem,
	PatientStatus,
	PatientType,
	RegisterPatientInput,
	RegisterPatientResponse,
	SearchPatientResult,
	SearchPatientsParams,
	UpdatePatientInput,
	UpdatePatientResponse,
} from "../lib/patients-client";
