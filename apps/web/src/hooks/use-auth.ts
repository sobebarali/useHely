/**
 * React hooks for auth client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type AuthUser,
	authClient,
	type Hospital,
	type MfaChallengeResponse,
	type MfaDisableResponse,
	type MfaSetupResponse,
	type MfaVerifyResponse,
	type SignInResponse,
} from "../lib/auth-client";

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
 * Returns SignInResponse which can be either AuthTokens or MfaChallengeResponse
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
		}): Promise<SignInResponse> =>
			authClient.signIn({ email, password, tenantId }),
		onSuccess: (data) => {
			// Only invalidate session if we got tokens (not MFA challenge)
			if (!authClient.isMfaChallengeResponse(data)) {
				queryClient.invalidateQueries({ queryKey: authKeys.session() });
			}
		},
	});
}

/**
 * Hook for submitting MFA code during login
 */
export function useSubmitMfaCode() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			challengeToken,
			code,
		}: {
			challengeToken: string;
			code: string;
		}) => authClient.submitMfaCode({ challengeToken, code }),
		onSuccess: () => {
			// Invalidate session query to refetch user data after successful MFA
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

/**
 * Hook for enabling MFA (starts setup flow)
 */
export function useEnableMfa() {
	return useMutation({
		mutationFn: () => authClient.enableMfa(),
	});
}

/**
 * Hook for verifying MFA setup with TOTP code
 */
export function useVerifyMfa() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ code }: { code: string }) => authClient.verifyMfa({ code }),
		onSuccess: () => {
			// Invalidate session to refetch user data with updated MFA status
			queryClient.invalidateQueries({ queryKey: authKeys.session() });
		},
	});
}

/**
 * Hook for disabling MFA
 */
export function useDisableMfa() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => authClient.disableMfa(),
		onSuccess: () => {
			// Invalidate session to refetch user data with updated MFA status
			queryClient.invalidateQueries({ queryKey: authKeys.session() });
		},
	});
}

export type {
	AuthUser,
	Hospital,
	MfaChallengeResponse,
	MfaSetupResponse,
	MfaVerifyResponse,
	MfaDisableResponse,
	SignInResponse,
};
