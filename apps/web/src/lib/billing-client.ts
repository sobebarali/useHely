/**
 * Billing Client
 *
 * Interfaces with billing API endpoints for subscription and billing portal management
 */

import { type ApiError, authenticatedRequest } from "./api-client";

// Billing types from server
export type SubscriptionStatus =
	| "PENDING"
	| "ACTIVE"
	| "ON_HOLD"
	| "CANCELLED"
	| "EXPIRED";

export type BillingCycle = "MONTHLY" | "YEARLY";

export type PricingTier = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export interface BillingSubscription {
	id: string;
	hospitalId: string;
	plan: PricingTier;
	status: SubscriptionStatus;
	billingCycle: BillingCycle;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	nextBillingDate: string | null;
	amount: number;
	currency: string;
	stripeCustomerId: string;
	stripeSubscriptionId: string | null;
	cancelledAt: string | null;
	cancellationReason: string | null;
	gracePeriodEnds: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface BillingPortalResponse {
	url: string;
	expiresAt: string;
}

/**
 * Get current subscription details
 * Requires: SUBSCRIPTION:READ permission
 */
export async function getBillingSubscription(): Promise<BillingSubscription> {
	return authenticatedRequest<BillingSubscription>(
		"/api/billing/subscription",
		{
			method: "GET",
		},
	);
}

/**
 * Get Stripe customer portal URL
 * Requires: BILLING:READ permission
 */
export async function getBillingPortal(): Promise<BillingPortalResponse> {
	return authenticatedRequest<BillingPortalResponse>("/api/billing/portal", {
		method: "GET",
	});
}

// Export ApiError type for error handling
export type { ApiError };
