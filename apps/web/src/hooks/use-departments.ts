/**
 * React hooks for departments client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type CreateDepartmentInput,
	departmentsClient,
	type ListDepartmentStaffParams,
	type ListDepartmentsParams,
	type UpdateDepartmentInput,
} from "../lib/departments-client";

// Query keys
export const departmentsKeys = {
	all: ["departments"] as const,
	lists: () => [...departmentsKeys.all, "list"] as const,
	list: (params: ListDepartmentsParams) =>
		[...departmentsKeys.lists(), params] as const,
	details: () => [...departmentsKeys.all, "detail"] as const,
	detail: (id: string) => [...departmentsKeys.details(), id] as const,
	tree: () => [...departmentsKeys.all, "tree"] as const,
	staffLists: (id: string) =>
		[...departmentsKeys.all, id, "staff", "list"] as const,
	staffList: (id: string, params: ListDepartmentStaffParams) =>
		[...departmentsKeys.staffLists(id), params] as const,
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

/**
 * Hook to get department hierarchy tree
 */
export function useDepartmentTree() {
	return useQuery({
		queryKey: departmentsKeys.tree(),
		queryFn: () => departmentsClient.getDepartmentTree(),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Hook to get staff in a department
 */
export function useDepartmentStaff(
	id: string,
	params: ListDepartmentStaffParams = {},
) {
	return useQuery({
		queryKey: departmentsKeys.staffList(id, params),
		queryFn: () => departmentsClient.getDepartmentStaff(id, params),
		enabled: !!id,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook for creating a new department
 */
export function useCreateDepartment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateDepartmentInput) =>
			departmentsClient.createDepartment(input),
		onSuccess: () => {
			// Invalidate department lists and tree to refetch
			queryClient.invalidateQueries({ queryKey: departmentsKeys.lists() });
			queryClient.invalidateQueries({ queryKey: departmentsKeys.tree() });
		},
	});
}

/**
 * Hook for updating a department
 */
export function useUpdateDepartment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentInput }) =>
			departmentsClient.updateDepartment({ id, data }),
		onSuccess: (_, variables) => {
			// Invalidate specific department and lists
			queryClient.invalidateQueries({
				queryKey: departmentsKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: departmentsKeys.lists() });
			queryClient.invalidateQueries({ queryKey: departmentsKeys.tree() });
		},
	});
}

/**
 * Hook for deleting (deactivating) a department
 */
export function useDeleteDepartment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => departmentsClient.deleteDepartment(id),
		onSuccess: (_, id) => {
			// Invalidate specific department and lists
			queryClient.invalidateQueries({ queryKey: departmentsKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: departmentsKeys.lists() });
			queryClient.invalidateQueries({ queryKey: departmentsKeys.tree() });
		},
	});
}

/**
 * Hook for assigning staff to a department
 */
export function useAssignStaffToDepartment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			departmentId,
			userId,
		}: {
			departmentId: string;
			userId: string;
		}) => departmentsClient.assignStaffToDepartment({ departmentId, userId }),
		onSuccess: (_, variables) => {
			// Invalidate department staff list and department detail
			queryClient.invalidateQueries({
				queryKey: departmentsKeys.staffLists(variables.departmentId),
			});
			queryClient.invalidateQueries({
				queryKey: departmentsKeys.detail(variables.departmentId),
			});
			queryClient.invalidateQueries({ queryKey: departmentsKeys.lists() });
		},
	});
}

/**
 * Hook for removing staff from a department
 */
export function useRemoveStaffFromDepartment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			departmentId,
			userId,
		}: {
			departmentId: string;
			userId: string;
		}) => departmentsClient.removeStaffFromDepartment({ departmentId, userId }),
		onSuccess: (_, variables) => {
			// Invalidate department staff list and department detail
			queryClient.invalidateQueries({
				queryKey: departmentsKeys.staffLists(variables.departmentId),
			});
			queryClient.invalidateQueries({
				queryKey: departmentsKeys.detail(variables.departmentId),
			});
			queryClient.invalidateQueries({ queryKey: departmentsKeys.lists() });
		},
	});
}

// Re-export types for convenience
export type {
	AssignStaffResponse,
	CreateDepartmentInput,
	CreateDepartmentResponse,
	DayOperatingHours,
	DeleteDepartmentResponse,
	DepartmentChild,
	DepartmentDetails,
	DepartmentHead,
	DepartmentListItem,
	DepartmentParent,
	DepartmentStaffItem,
	DepartmentStatus,
	DepartmentTreeNode,
	DepartmentTreeResponse,
	DepartmentType,
	ListDepartmentStaffParams,
	ListDepartmentStaffResponse,
	ListDepartmentsParams,
	ListDepartmentsResponse,
	OperatingHours,
	RemoveStaffResponse,
	UpdateDepartmentInput,
	UpdateDepartmentResponse,
} from "../lib/departments-client";
