/**
 * React hooks for hospital operations using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	authClient,
	type HospitalDetails,
	type HospitalStatus,
	type RegisterHospitalInput,
	type RegisterHospitalResponse,
	type UpdateHospitalInput,
	type UpdateHospitalStatusInput,
	type UpdateHospitalStatusResponse,
	type VerifyHospitalResponse,
} from "../lib/auth-client";

// Query keys
export const hospitalKeys = {
	all: ["hospital"] as const,
	detail: (id: string) => [...hospitalKeys.all, "detail", id] as const,
};

/**
 * Hook to get hospital details by ID
 */
export function useHospital(hospitalId: string | undefined) {
	return useQuery({
		queryKey: hospitalKeys.detail(hospitalId ?? ""),
		queryFn: () => {
			if (!hospitalId) {
				throw new Error("Hospital ID is required");
			}
			return authClient.getHospital(hospitalId);
		},
		enabled: !!hospitalId,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Hook for hospital registration mutation
 */
export function useRegisterHospital() {
	return useMutation({
		mutationFn: (data: RegisterHospitalInput) =>
			authClient.registerHospital(data),
	});
}

/**
 * Hook for hospital verification mutation
 */
export function useVerifyHospital() {
	return useMutation({
		mutationFn: ({
			hospitalId,
			token,
		}: {
			hospitalId: string;
			token: string;
		}) => authClient.verifyHospital({ hospitalId, token }),
	});
}

/**
 * Hook for hospital update mutation
 */
export function useUpdateHospital() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			hospitalId,
			data,
		}: {
			hospitalId: string;
			data: UpdateHospitalInput;
		}) => authClient.updateHospital({ hospitalId, data }),
		onSuccess: (data, variables) => {
			// Update the cache with new data
			queryClient.setQueryData(hospitalKeys.detail(variables.hospitalId), data);
		},
	});
}

/**
 * Hook for hospital status update mutation (SUPER_ADMIN only)
 */
export function useUpdateHospitalStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			hospitalId,
			data,
		}: {
			hospitalId: string;
			data: UpdateHospitalStatusInput;
		}) => authClient.updateHospitalStatus({ hospitalId, data }),
		onSuccess: (_, variables) => {
			// Invalidate hospital detail cache to refetch
			queryClient.invalidateQueries({
				queryKey: hospitalKeys.detail(variables.hospitalId),
			});
		},
	});
}

export type {
	HospitalDetails,
	HospitalStatus,
	RegisterHospitalInput,
	RegisterHospitalResponse,
	UpdateHospitalInput,
	UpdateHospitalStatusInput,
	UpdateHospitalStatusResponse,
	VerifyHospitalResponse,
};
