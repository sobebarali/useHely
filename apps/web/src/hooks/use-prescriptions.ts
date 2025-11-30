/**
 * React hooks for prescriptions client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type CancelPrescriptionInput,
	type CreatePrescriptionInput,
	type CreateTemplateInput,
	type ListPrescriptionsParams,
	type ListTemplatesParams,
	prescriptionsClient,
	type UpdatePrescriptionInput,
	type UpdateTemplateInput,
} from "../lib/prescriptions-client";

// Query keys
export const prescriptionsKeys = {
	all: ["prescriptions"] as const,
	lists: () => [...prescriptionsKeys.all, "list"] as const,
	list: (params: ListPrescriptionsParams) =>
		[...prescriptionsKeys.lists(), params] as const,
	details: () => [...prescriptionsKeys.all, "detail"] as const,
	detail: (id: string) => [...prescriptionsKeys.details(), id] as const,
};

export const templatesKeys = {
	all: ["prescription-templates"] as const,
	lists: () => [...templatesKeys.all, "list"] as const,
	list: (params: ListTemplatesParams) =>
		[...templatesKeys.lists(), params] as const,
	details: () => [...templatesKeys.all, "detail"] as const,
	detail: (id: string) => [...templatesKeys.details(), id] as const,
};

/**
 * Hook to list prescriptions with pagination and filters
 */
export function usePrescriptions(params: ListPrescriptionsParams = {}) {
	return useQuery({
		queryKey: prescriptionsKeys.list(params),
		queryFn: () => prescriptionsClient.listPrescriptions(params),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook to get prescription by ID
 */
export function usePrescription(id: string) {
	return useQuery({
		queryKey: prescriptionsKeys.detail(id),
		queryFn: () => prescriptionsClient.getPrescriptionById(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook for creating a new prescription
 */
export function useCreatePrescription() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreatePrescriptionInput) =>
			prescriptionsClient.createPrescription(input),
		onSuccess: () => {
			// Invalidate prescriptions list to refetch
			queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
		},
	});
}

/**
 * Hook for updating a prescription
 */
export function useUpdatePrescription() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdatePrescriptionInput }) =>
			prescriptionsClient.updatePrescription({ id, data }),
		onSuccess: (_, variables) => {
			// Invalidate specific prescription and lists
			queryClient.invalidateQueries({
				queryKey: prescriptionsKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
		},
	});
}

/**
 * Hook for cancelling a prescription
 */
export function useCancelPrescription() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: CancelPrescriptionInput }) =>
			prescriptionsClient.cancelPrescription({ id, data }),
		onSuccess: (_, variables) => {
			// Invalidate specific prescription and lists
			queryClient.invalidateQueries({
				queryKey: prescriptionsKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: prescriptionsKeys.lists() });
		},
	});
}

/**
 * Hook to list prescription templates
 */
export function useTemplates(params: ListTemplatesParams = {}) {
	return useQuery({
		queryKey: templatesKeys.list(params),
		queryFn: () => prescriptionsClient.listTemplates(params),
		staleTime: 1000 * 60 * 5, // 5 minutes (templates change less frequently)
	});
}

/**
 * Hook to get template by ID
 */
export function useTemplate(id: string) {
	return useQuery({
		queryKey: templatesKeys.detail(id),
		queryFn: () => prescriptionsClient.getTemplateById(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Hook for creating a new template
 */
export function useCreateTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateTemplateInput) =>
			prescriptionsClient.createTemplate(input),
		onSuccess: () => {
			// Invalidate templates list to refetch
			queryClient.invalidateQueries({ queryKey: templatesKeys.lists() });
		},
	});
}

/**
 * Hook for updating a template
 */
export function useUpdateTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateTemplateInput }) =>
			prescriptionsClient.updateTemplate({ id, data }),
		onSuccess: (_, variables) => {
			// Invalidate specific template and lists
			queryClient.invalidateQueries({
				queryKey: templatesKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: templatesKeys.lists() });
		},
	});
}

/**
 * Hook for deleting a template
 */
export function useDeleteTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => prescriptionsClient.deleteTemplate(id),
		onSuccess: (_, _variables) => {
			// Invalidate templates list
			queryClient.invalidateQueries({ queryKey: templatesKeys.lists() });
		},
	});
}

// Re-export types for convenience
export type {
	ApiError,
	CancelPrescriptionInput,
	CancelPrescriptionResponse,
	CreatePrescriptionInput,
	CreatePrescriptionResponse,
	CreateTemplateInput,
	CreateTemplateResponse,
	DeleteTemplateResponse,
	DoctorInfo,
	ListPrescriptionsParams,
	ListPrescriptionsResponse,
	ListTemplatesParams,
	ListTemplatesResponse,
	Medicine,
	MedicineInput,
	PatientDetailInfo,
	PatientInfo,
	PrescriptionDetails,
	PrescriptionListItem,
	PrescriptionStatus,
	TemplateDetails,
	TemplateListItem,
	TemplateMedicine,
	UpdatePrescriptionInput,
	UpdatePrescriptionResponse,
	UpdateTemplateInput,
	UpdateTemplateResponse,
} from "../lib/prescriptions-client";
