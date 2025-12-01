/**
 * React hooks for inventory client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type AddMedicineInput,
	type AddStockInput,
	type AdjustStockInput,
	type ExpiringParams,
	inventoryClient,
	type ListInventoryParams,
	type ListMedicinesParams,
	type LowStockParams,
	type TransactionsParams,
} from "../lib/inventory-client";

// Query keys
export const inventoryKeys = {
	all: ["inventory"] as const,
	lists: () => [...inventoryKeys.all, "list"] as const,
	list: (params: ListInventoryParams) =>
		[...inventoryKeys.lists(), params] as const,
	details: () => [...inventoryKeys.all, "detail"] as const,
	detail: (id: string) => [...inventoryKeys.details(), id] as const,
	medicines: () => [...inventoryKeys.all, "medicines"] as const,
	medicineList: (params: ListMedicinesParams) =>
		[...inventoryKeys.medicines(), params] as const,
	lowStock: (params: LowStockParams) =>
		[...inventoryKeys.all, "low-stock", params] as const,
	expiring: (params: ExpiringParams) =>
		[...inventoryKeys.all, "expiring", params] as const,
	transactions: (params: TransactionsParams) =>
		[...inventoryKeys.all, "transactions", params] as const,
};

/**
 * Hook to list inventory items with pagination and filters
 */
export function useInventory(params: ListInventoryParams = {}) {
	return useQuery({
		queryKey: inventoryKeys.list(params),
		queryFn: () => inventoryClient.listInventory(params),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook to get inventory item by ID
 */
export function useInventoryItem(id: string) {
	return useQuery({
		queryKey: inventoryKeys.detail(id),
		queryFn: () => inventoryClient.getInventoryById(id),
		enabled: !!id,
		staleTime: 1000 * 60, // 1 minute
	});
}

/**
 * Hook to list medicines catalog
 */
export function useMedicines(params: ListMedicinesParams = {}) {
	return useQuery({
		queryKey: inventoryKeys.medicineList(params),
		queryFn: () => inventoryClient.listMedicines(params),
		staleTime: 1000 * 60 * 5, // 5 minutes - medicine catalog doesn't change often
	});
}

/**
 * Hook to get low stock items
 */
export function useLowStock(params: LowStockParams = {}) {
	return useQuery({
		queryKey: inventoryKeys.lowStock(params),
		queryFn: () => inventoryClient.getLowStock(params),
		staleTime: 1000 * 60, // 1 minute - low stock should refresh frequently
	});
}

/**
 * Hook to get expiring items
 */
export function useExpiring(params: ExpiringParams = {}) {
	return useQuery({
		queryKey: inventoryKeys.expiring(params),
		queryFn: () => inventoryClient.getExpiring(params),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Hook to get transaction history
 */
export function useTransactions(params: TransactionsParams = {}) {
	return useQuery({
		queryKey: inventoryKeys.transactions(params),
		queryFn: () => inventoryClient.getTransactions(params),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook for adding a medicine to the catalog
 */
export function useAddMedicine() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: AddMedicineInput) => inventoryClient.addMedicine(input),
		onSuccess: () => {
			// Invalidate medicines list and inventory lists
			queryClient.invalidateQueries({ queryKey: inventoryKeys.medicines() });
			queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
		},
	});
}

/**
 * Hook for adding stock to an inventory item
 */
export function useAddStock() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: AddStockInput }) =>
			inventoryClient.addStock({ id, input }),
		onSuccess: (_, variables) => {
			// Invalidate specific item, lists, low stock, and expiring
			queryClient.invalidateQueries({
				queryKey: inventoryKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: [...inventoryKeys.all, "low-stock"],
			});
			queryClient.invalidateQueries({
				queryKey: [...inventoryKeys.all, "expiring"],
			});
		},
	});
}

/**
 * Hook for adjusting stock of an inventory item
 */
export function useAdjustStock() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: AdjustStockInput }) =>
			inventoryClient.adjustStock({ id, input }),
		onSuccess: (_, variables) => {
			// Invalidate specific item, lists, low stock, and transactions
			queryClient.invalidateQueries({
				queryKey: inventoryKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: [...inventoryKeys.all, "low-stock"],
			});
			queryClient.invalidateQueries({
				queryKey: [...inventoryKeys.all, "transactions"],
			});
		},
	});
}

// Re-export types for convenience
export type {
	AddMedicineInput,
	AddMedicineResponse,
	AddStockInput,
	AddStockResponse,
	AdjustmentReason,
	AdjustStockInput,
	AdjustStockResponse,
	Batch,
	ExpiringItem,
	ExpiringParams,
	ExpiringResponse,
	InventoryItemDetails,
	InventoryItemSummary,
	InventorySummary,
	ListInventoryParams,
	ListInventoryResponse,
	ListMedicinesParams,
	ListMedicinesResponse,
	LowStockItem,
	LowStockParams,
	LowStockResponse,
	MedicineCategory,
	MedicineDetails,
	MedicineItem,
	MedicineType,
	StockStatus,
	Transaction,
	TransactionItem,
	TransactionsParams,
	TransactionsResponse,
	TransactionType,
} from "../lib/inventory-client";
