/**
 * React hooks for dispensing client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type CompleteDispensingInput,
	type DispenseMedicinesInput,
	dispensingClient,
	type ListHistoryParams,
	type ListPendingParams,
	type MarkUnavailableInput,
	type ReturnToQueueInput,
} from "../lib/dispensing-client";

// Re-export types for convenience
export type {
	CompleteDispensingInput,
	CompleteDispensingResponse,
	CompletedMedicineDetail,
	DispensedMedicineStatus,
	DispenseMedicinesInput,
	DispenseMedicinesResponse,
	DispensingMedicineDetail,
	DispensingPatient,
	DispensingPharmacist,
	DispensingPrescription,
	DispensingStatus,
	GetDispensingByIdResponse,
	HistoryRecord,
	ListHistoryParams,
	ListHistoryResponse,
	ListPendingParams,
	ListPendingResponse,
	MarkUnavailableInput,
	MarkUnavailableResponse,
	MedicineDispenseInput,
	MedicineDispensingItem,
	PendingMedicine,
	PendingPrescription,
	PendingSummary,
	Priority,
	ReturnToQueueInput,
	ReturnToQueueResponse,
	StartDispensingResponse,
} from "../lib/dispensing-client";

// Query keys
export const dispensingKeys = {
	all: ["dispensing"] as const,
	pending: () => [...dispensingKeys.all, "pending"] as const,
	pendingList: (params: ListPendingParams) =>
		[...dispensingKeys.pending(), params] as const,
	history: () => [...dispensingKeys.all, "history"] as const,
	historyList: (params: ListHistoryParams) =>
		[...dispensingKeys.history(), params] as const,
	details: () => [...dispensingKeys.all, "detail"] as const,
	detail: (id: string) => [...dispensingKeys.details(), id] as const,
};

/**
 * Hook to list pending prescriptions for dispensing
 */
export function usePendingDispensing(params: ListPendingParams = {}) {
	return useQuery({
		queryKey: dispensingKeys.pendingList(params),
		queryFn: () => dispensingClient.listPending(params),
		staleTime: 1000 * 30, // 30 seconds - pending queue should refresh frequently
	});
}

/**
 * Hook to list dispensing history
 */
export function useDispensingHistory(params: ListHistoryParams = {}) {
	return useQuery({
		queryKey: dispensingKeys.historyList(params),
		queryFn: () => dispensingClient.listHistory(params),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook to get dispensing record by prescription ID
 */
export function useDispensing(prescriptionId: string) {
	return useQuery({
		queryKey: dispensingKeys.detail(prescriptionId),
		queryFn: () => dispensingClient.getById(prescriptionId),
		enabled: !!prescriptionId,
		staleTime: 1000 * 60, // 1 minute
	});
}

/**
 * Hook for starting dispensing of a prescription
 */
export function useStartDispensing() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (prescriptionId: string) =>
			dispensingClient.startDispensing(prescriptionId),
		onSuccess: (_, prescriptionId) => {
			// Invalidate pending list and the specific prescription detail
			queryClient.invalidateQueries({ queryKey: dispensingKeys.pending() });
			queryClient.invalidateQueries({
				queryKey: dispensingKeys.detail(prescriptionId),
			});
		},
	});
}

/**
 * Hook for dispensing medicines
 */
export function useDispenseMedicines() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			prescriptionId,
			input,
		}: {
			prescriptionId: string;
			input: DispenseMedicinesInput;
		}) => dispensingClient.dispenseMedicines(prescriptionId, input),
		onSuccess: (_, variables) => {
			// Invalidate the specific prescription detail
			queryClient.invalidateQueries({
				queryKey: dispensingKeys.detail(variables.prescriptionId),
			});
		},
	});
}

/**
 * Hook for completing dispensing
 */
export function useCompleteDispensing() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			prescriptionId,
			input,
		}: {
			prescriptionId: string;
			input?: CompleteDispensingInput;
		}) => dispensingClient.completeDispensing(prescriptionId, input),
		onSuccess: (_, variables) => {
			// Invalidate pending list, history, and the specific prescription detail
			queryClient.invalidateQueries({ queryKey: dispensingKeys.pending() });
			queryClient.invalidateQueries({ queryKey: dispensingKeys.history() });
			queryClient.invalidateQueries({
				queryKey: dispensingKeys.detail(variables.prescriptionId),
			});
		},
	});
}

/**
 * Hook for marking medicine as unavailable
 */
export function useMarkUnavailable() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			prescriptionId,
			input,
		}: {
			prescriptionId: string;
			input: MarkUnavailableInput;
		}) => dispensingClient.markUnavailable(prescriptionId, input),
		onSuccess: (_, variables) => {
			// Invalidate the specific prescription detail
			queryClient.invalidateQueries({
				queryKey: dispensingKeys.detail(variables.prescriptionId),
			});
		},
	});
}

/**
 * Hook for returning prescription to queue
 */
export function useReturnToQueue() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			prescriptionId,
			input,
		}: {
			prescriptionId: string;
			input: ReturnToQueueInput;
		}) => dispensingClient.returnToQueue(prescriptionId, input),
		onSuccess: (_, variables) => {
			// Invalidate pending list and the specific prescription detail
			queryClient.invalidateQueries({ queryKey: dispensingKeys.pending() });
			queryClient.invalidateQueries({
				queryKey: dispensingKeys.detail(variables.prescriptionId),
			});
		},
	});
}
