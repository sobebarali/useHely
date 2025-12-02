/**
 * Billing constants for SaaS subscription management
 *
 * Tier limits, feature definitions, and Dodo Payments configuration
 */

import type { PricingTierValue } from "@hms/db";

// Feature names available in the system
export const Features = {
	// Core features
	OPD: "OPD",
	IPD: "IPD",
	PHARMACY: "PHARMACY",
	INVENTORY: "INVENTORY",

	// Reporting
	BASIC_REPORTS: "BASIC_REPORTS",
	ADVANCED_ANALYTICS: "ADVANCED_ANALYTICS",

	// Access & Integration
	API_ACCESS: "API_ACCESS",
	CUSTOM_ROLES: "CUSTOM_ROLES",

	// Enterprise features
	MULTI_LOCATION: "MULTI_LOCATION",
	CUSTOM_INTEGRATIONS: "CUSTOM_INTEGRATIONS",
	DEDICATED_SUPPORT: "DEDICATED_SUPPORT",
} as const;

export type FeatureValue = (typeof Features)[keyof typeof Features];

// Tier limits configuration
export interface TierLimits {
	maxUsers: number; // -1 means unlimited
	maxPatients: number; // -1 means unlimited
	features: FeatureValue[];
}

export const TIER_LIMITS: Record<PricingTierValue, TierLimits> = {
	FREE: {
		maxUsers: 2,
		maxPatients: 100,
		features: [Features.OPD, Features.BASIC_REPORTS],
	},
	STARTER: {
		maxUsers: 5,
		maxPatients: 1000,
		features: [Features.OPD, Features.BASIC_REPORTS],
	},
	PROFESSIONAL: {
		maxUsers: 50,
		maxPatients: -1, // unlimited
		features: [
			Features.OPD,
			Features.IPD,
			Features.PHARMACY,
			Features.INVENTORY,
			Features.BASIC_REPORTS,
			Features.ADVANCED_ANALYTICS,
			Features.API_ACCESS,
			Features.CUSTOM_ROLES,
		],
	},
	ENTERPRISE: {
		maxUsers: -1, // unlimited
		maxPatients: -1, // unlimited
		features: [
			Features.OPD,
			Features.IPD,
			Features.PHARMACY,
			Features.INVENTORY,
			Features.BASIC_REPORTS,
			Features.ADVANCED_ANALYTICS,
			Features.API_ACCESS,
			Features.CUSTOM_ROLES,
			Features.MULTI_LOCATION,
			Features.CUSTOM_INTEGRATIONS,
			Features.DEDICATED_SUPPORT,
		],
	},
} as const;

// Grace period in days for subscription on_hold before restricting access
export const GRACE_PERIOD_DAYS = 7;

// Trial period in days (3 months as per landing page)
export const TRIAL_PERIOD_DAYS = 90;

// Dodo Payments environment configuration
export const DodoConfig = {
	apiKey: process.env.DODO_PAYMENTS_API_KEY || "",
	webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY || "",
	environment: (process.env.DODO_PAYMENTS_ENVIRONMENT ||
		"test_mode") as DodoEnvironment,
	returnUrl: process.env.DODO_PAYMENTS_RETURN_URL || "",
} as const;

export type DodoEnvironment = "test_mode" | "live_mode";

// Dodo product IDs (configured in Dodo dashboard)
export const DodoProducts = {
	STARTER_MONTHLY: process.env.DODO_STARTER_MONTHLY_PRODUCT_ID || "",
	STARTER_YEARLY: process.env.DODO_STARTER_YEARLY_PRODUCT_ID || "",
	PROFESSIONAL_MONTHLY: process.env.DODO_PROFESSIONAL_MONTHLY_PRODUCT_ID || "",
	PROFESSIONAL_YEARLY: process.env.DODO_PROFESSIONAL_YEARLY_PRODUCT_ID || "",
	// Enterprise is custom pricing via sales contact
} as const;

// Map Dodo product IDs to pricing tiers
export function getTierFromProductId(
	productId: string,
): PricingTierValue | null {
	if (
		productId === DodoProducts.STARTER_MONTHLY ||
		productId === DodoProducts.STARTER_YEARLY
	) {
		return "STARTER";
	}
	if (
		productId === DodoProducts.PROFESSIONAL_MONTHLY ||
		productId === DodoProducts.PROFESSIONAL_YEARLY
	) {
		return "PROFESSIONAL";
	}
	// Enterprise subscriptions are handled manually
	return null;
}

// Map pricing tiers to default Dodo product IDs (monthly)
export function getProductIdFromTier(
	tier: PricingTierValue,
	cycle: "MONTHLY" | "YEARLY" = "MONTHLY",
): string | null {
	switch (tier) {
		case "STARTER":
			return cycle === "MONTHLY"
				? DodoProducts.STARTER_MONTHLY
				: DodoProducts.STARTER_YEARLY;
		case "PROFESSIONAL":
			return cycle === "MONTHLY"
				? DodoProducts.PROFESSIONAL_MONTHLY
				: DodoProducts.PROFESSIONAL_YEARLY;
		case "FREE":
		case "ENTERPRISE":
			return null; // No Dodo product for these tiers
		default:
			return null;
	}
}

/**
 * Check if a tier has access to a specific feature
 */
export function tierHasFeature(
	tier: PricingTierValue,
	feature: FeatureValue,
): boolean {
	const limits = TIER_LIMITS[tier];
	if (!limits) return false;

	// Enterprise has all features
	if (tier === "ENTERPRISE") return true;

	return limits.features.includes(feature);
}

/**
 * Check if a tier allows the given number of users
 */
export function tierAllowsUsers(
	tier: PricingTierValue,
	currentCount: number,
): boolean {
	const limits = TIER_LIMITS[tier];
	if (!limits) return false;

	// -1 means unlimited
	if (limits.maxUsers === -1) return true;

	return currentCount < limits.maxUsers;
}

/**
 * Check if a tier allows the given number of patients
 */
export function tierAllowsPatients(
	tier: PricingTierValue,
	currentCount: number,
): boolean {
	const limits = TIER_LIMITS[tier];
	if (!limits) return false;

	// -1 means unlimited
	if (limits.maxPatients === -1) return true;

	return currentCount < limits.maxPatients;
}

/**
 * Get the minimum required tier for a feature
 */
export function getMinimumTierForFeature(
	feature: FeatureValue,
): PricingTierValue {
	const tiers: PricingTierValue[] = [
		"FREE",
		"STARTER",
		"PROFESSIONAL",
		"ENTERPRISE",
	];

	for (const tier of tiers) {
		if (tierHasFeature(tier, feature)) {
			return tier;
		}
	}

	return "ENTERPRISE";
}

// Billing error codes
export const BillingErrorCodes = {
	FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE",
	USER_LIMIT_REACHED: "USER_LIMIT_REACHED",
	PATIENT_LIMIT_REACHED: "PATIENT_LIMIT_REACHED",
	SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
	SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
	SUBSCRIPTION_ON_HOLD: "SUBSCRIPTION_ON_HOLD",
	GRACE_PERIOD_EXPIRED: "GRACE_PERIOD_EXPIRED",
	UPGRADE_REQUIRED: "UPGRADE_REQUIRED",
	CHECKOUT_FAILED: "CHECKOUT_FAILED",
	WEBHOOK_INVALID_SIGNATURE: "WEBHOOK_INVALID_SIGNATURE",
	WEBHOOK_PROCESSING_ERROR: "WEBHOOK_PROCESSING_ERROR",
} as const;

export type BillingErrorCode =
	(typeof BillingErrorCodes)[keyof typeof BillingErrorCodes];
