/**
 * React hooks for users client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ChangePasswordInput,
	type CreateUserInput,
	type ListUsersParams,
	type UpdateUserInput,
	usersClient,
} from "../lib/users-client";

// Query keys
export const usersKeys = {
	all: ["users"] as const,
	lists: () => [...usersKeys.all, "list"] as const,
	list: (params: ListUsersParams) => [...usersKeys.lists(), params] as const,
	details: () => [...usersKeys.all, "detail"] as const,
	detail: (id: string) => [...usersKeys.details(), id] as const,
};

/**
 * Hook to list users with pagination and filters
 */
export function useUsers(params: ListUsersParams = {}) {
	return useQuery({
		queryKey: usersKeys.list(params),
		queryFn: () => usersClient.listUsers(params),
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook to get user by ID
 */
export function useUser(id: string) {
	return useQuery({
		queryKey: usersKeys.detail(id),
		queryFn: () => usersClient.getUserById(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

/**
 * Hook for creating a new user
 */
export function useCreateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateUserInput) => usersClient.createUser(input),
		onSuccess: () => {
			// Invalidate users list to refetch
			queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
		},
	});
}

/**
 * Hook for updating a user
 */
export function useUpdateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
			usersClient.updateUser({ id, data }),
		onSuccess: (_, variables) => {
			// Invalidate specific user and lists
			queryClient.invalidateQueries({
				queryKey: usersKeys.detail(variables.id),
			});
			queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
		},
	});
}

/**
 * Hook for deactivating a user
 */
export function useDeactivateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => usersClient.deactivateUser(id),
		onSuccess: (_, id) => {
			// Invalidate specific user and lists
			queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
		},
	});
}

/**
 * Hook for forcing password change
 */
export function useForcePasswordChange() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => usersClient.forcePasswordChange(id),
		onSuccess: (_, id) => {
			// Invalidate specific user
			queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
		},
	});
}

/**
 * Hook for changing own password (authenticated user)
 */
export function useChangePassword() {
	return useMutation({
		mutationFn: (input: ChangePasswordInput) =>
			usersClient.changePassword(input),
	});
}

/**
 * Hook for forgot password (public - no auth required)
 */
export function useForgotPassword() {
	return useMutation({
		mutationFn: ({ email, tenantId }: { email: string; tenantId: string }) =>
			usersClient.forgotPassword({ email, tenant_id: tenantId }),
	});
}

/**
 * Hook for reset password (public - no auth required)
 */
export function useResetPassword() {
	return useMutation({
		mutationFn: ({
			token,
			newPassword,
			confirmPassword,
		}: {
			token: string;
			newPassword: string;
			confirmPassword: string;
		}) => usersClient.resetPassword({ token, newPassword, confirmPassword }),
	});
}

// Re-export types for convenience
export type {
	ChangePasswordInput,
	ChangePasswordResponse,
	CreateUserInput,
	CreateUserResponse,
	DeactivateUserResponse,
	ForcePasswordChangeResponse,
	ListUsersParams,
	ListUsersResponse,
	UpdateUserInput,
	UpdateUserResponse,
	UserDetails,
	UserListItem,
} from "../lib/users-client";
