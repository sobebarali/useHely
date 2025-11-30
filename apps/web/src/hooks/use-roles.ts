/**
 * React hooks for roles client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type CreateRoleInput,
	type ListRolesParams,
	rolesClient,
	type UpdateRoleInput,
} from "../lib/roles-client";

// Query keys
export const rolesKeys = {
	all: ["roles"] as const,
	lists: () => [...rolesKeys.all, "list"] as const,
	list: (params: ListRolesParams) => [...rolesKeys.lists(), params] as const,
	details: () => [...rolesKeys.all, "detail"] as const,
	detail: (id: string) => [...rolesKeys.details(), id] as const,
};

/**
 * Hook to list roles with pagination and filters
 */
export function useRoles(params: ListRolesParams = {}) {
	return useQuery({
		queryKey: rolesKeys.list(params),
		queryFn: () => rolesClient.listRoles(params),
		staleTime: 1000 * 60 * 5, // 5 minutes - roles don't change often
	});
}

/**
 * Hook to get role by ID
 */
export function useRole(id: string) {
	return useQuery({
		queryKey: rolesKeys.detail(id),
		queryFn: () => rolesClient.getRoleById(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Hook to create a new role
 */
export function useCreateRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateRoleInput) => rolesClient.createRole(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
		},
	});
}

/**
 * Hook to update a role
 */
export function useUpdateRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateRoleInput }) =>
			rolesClient.updateRole({ id, data }),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: rolesKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
		},
	});
}

/**
 * Hook to delete (deactivate) a role
 */
export function useDeleteRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => rolesClient.deleteRole(id),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: rolesKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
		},
	});
}

// Re-export types for convenience
export type {
	ApiError,
	CreateRoleInput,
	CreateRoleOutput,
	DeleteRoleOutput,
	ListRolesParams,
	ListRolesResponse,
	RoleDetails,
	RoleListItem,
	UpdateRoleInput,
	UpdateRoleOutput,
} from "../lib/roles-client";
