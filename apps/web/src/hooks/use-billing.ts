/**
 * React hooks for billing operations using TanStack Query
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import {
	type ApiError,
	type BillingPortalResponse,
	type BillingSubscription,
	getBillingPortal,
	getBillingSubscription,
} from "@/lib/billing-client";

// Query keys
export const billingKeys = {
	all: ["billing"] as const,
	subscription: () => [...billingKeys.all, "subscription"] as const,
	portal: () => [...billingKeys.all, "portal"] as const,
};

/**
 * Hook to get current billing subscription
 * Requires: SUBSCRIPTION:READ permission
 */
export function useBillingSubscription() {
	return useQuery({
		queryKey: billingKeys.subscription(),
		queryFn: () => getBillingSubscription(),
		staleTime: 1000 * 60 * 5, // 5 minutes
		retry: 1, // Only retry once for permission errors
	});
}

/**
 * Hook to get billing portal URL
 * Requires: BILLING:READ permission
 */
export function useBillingPortal() {
	return useMutation({
		mutationFn: () => getBillingPortal(),
	});
}

// Re-export types for convenience
export type {
	ApiError,
	BillingCycle,
	BillingPortalResponse,
	BillingSubscription,
	PricingTier,
	SubscriptionStatus,
} from "@/lib/billing-client";
