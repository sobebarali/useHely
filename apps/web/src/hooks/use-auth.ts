/**
 * React hooks for auth client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AuthUser, authClient, type Hospital } from "../lib/auth-client";

// Query keys
export const authKeys = {
	all: ["auth"] as const,
	session: () => [...authKeys.all, "session"] as const,
	hospitals: (email: string) => [...authKeys.all, "hospitals", email] as const,
};

/**
 * Hook to get current user session
 */
export function useSession() {
	return useQuery({
		queryKey: authKeys.session(),
		queryFn: () => authClient.getSession(),
		staleTime: 1000 * 60 * 5, // 5 minutes
		retry: false,
	});
}

/**
 * Hook to get hospitals for an email
 */
export function useHospitalsForEmail(email: string) {
	return useQuery({
		queryKey: authKeys.hospitals(email),
		queryFn: () => authClient.getHospitalsForEmail(email),
		enabled: !!email && email.includes("@"),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Hook for sign in mutation
 */
export function useSignIn() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			email,
			password,
			tenantId,
		}: {
			email: string;
			password: string;
			tenantId: string;
		}) => authClient.signIn({ email, password, tenantId }),
		onSuccess: () => {
			// Invalidate session query to refetch user data
			queryClient.invalidateQueries({ queryKey: authKeys.session() });
		},
	});
}

/**
 * Hook for sign out mutation
 */
export function useSignOut() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: () => {
			// Clear all auth-related queries
			queryClient.removeQueries({ queryKey: authKeys.all });
			queryClient.setQueryData(authKeys.session(), null);
		},
	});
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
	const { data: session, isLoading } = useSession();
	if (isLoading) return authClient.isAuthenticated();
	return !!session;
}

export type { AuthUser, Hospital };
