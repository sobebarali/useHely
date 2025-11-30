/**
 * React hooks for security client using TanStack Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type KeyStatus,
	type ListSecurityEventsParams,
	type ListSecurityEventsResponse,
	type RotateKeysResponse,
	type SecurityEvent,
	type SecurityEventSeverity,
	type SecurityEventType,
	securityClient,
} from "../lib/security-client";

// Query keys
export const securityKeys = {
	all: ["security"] as const,
	events: () => [...securityKeys.all, "events"] as const,
	eventsList: (params: ListSecurityEventsParams) =>
		[...securityKeys.events(), "list", params] as const,
	event: (id: string) => [...securityKeys.events(), "detail", id] as const,
	keys: () => [...securityKeys.all, "keys"] as const,
	keyStatus: () => [...securityKeys.keys(), "status"] as const,
};

/**
 * Hook to list security events with filtering and pagination
 */
export function useSecurityEvents(params: ListSecurityEventsParams = {}) {
	return useQuery({
		queryKey: securityKeys.eventsList(params),
		queryFn: () => securityClient.listSecurityEvents(params),
		staleTime: 1000 * 60 * 1, // 1 minute - events can change frequently
	});
}

/**
 * Hook to get a single security event by ID
 */
export function useSecurityEvent(id: string) {
	return useQuery({
		queryKey: securityKeys.event(id),
		queryFn: () => securityClient.getSecurityEvent(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 5, // 5 minutes - individual events don't change
	});
}

/**
 * Hook to get encryption key status
 */
export function useKeyStatus() {
	return useQuery({
		queryKey: securityKeys.keyStatus(),
		queryFn: () => securityClient.getKeyStatus(),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
}

/**
 * Hook for rotating encryption keys
 */
export function useRotateKeys() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => securityClient.rotateKeys(),
		onSuccess: () => {
			// Invalidate key status to refetch updated data
			queryClient.invalidateQueries({ queryKey: securityKeys.keyStatus() });
			// Also invalidate events as a key rotation event will be created
			queryClient.invalidateQueries({ queryKey: securityKeys.events() });
		},
	});
}

export type {
	KeyStatus,
	ListSecurityEventsParams,
	ListSecurityEventsResponse,
	RotateKeysResponse,
	SecurityEvent,
	SecurityEventSeverity,
	SecurityEventType,
};
