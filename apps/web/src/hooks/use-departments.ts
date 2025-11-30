/**
 * React hooks for departments client using TanStack Query
 */

import { useQuery } from "@tanstack/react-query";
import {
	departmentsClient,
	type ListDepartmentsParams,
} from "../lib/departments-client";

// Query keys
export const departmentsKeys = {
	all: ["departments"] as const,
	lists: () => [...departmentsKeys.all, "list"] as const,
	list: (params: ListDepartmentsParams) =>
		[...departmentsKeys.lists(), params] as const,
	details: () => [...departmentsKeys.all, "detail"] as const,
	detail: (id: string) => [...departmentsKeys.details(), id] as const,
};

/**
 * Hook to list departments with pagination and filters
 */
export function useDepartments(params: ListDepartmentsParams = {}) {
	return useQuery({
		queryKey: departmentsKeys.list(params),
		queryFn: () => departmentsClient.listDepartments(params),
		staleTime: 1000 * 60 * 5, // 5 minutes - departments don't change often
	});
}

/**
 * Hook to get department by ID
 */
export function useDepartment(id: string) {
	return useQuery({
		queryKey: departmentsKeys.detail(id),
		queryFn: () => departmentsClient.getDepartmentById(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

// Re-export types for convenience
export type {
	DepartmentDetails,
	DepartmentHead,
	DepartmentListItem,
	DepartmentStatus,
	DepartmentType,
	ListDepartmentsParams,
	ListDepartmentsResponse,
} from "../lib/departments-client";
