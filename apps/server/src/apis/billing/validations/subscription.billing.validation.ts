import { z } from "zod";

// Get subscription validation
export const getSubscriptionSchema = z.object({
	// No params needed - uses tenantId from auth
});

// Subscription response
export interface SubscriptionOutput {
	id: string | null;
	tenantId: string;
	status: string;
	plan: string;
	billingCycle: string | null;
	currentPeriodStart: string | null;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	trialEndsAt: string | null;
	dodoCustomerId: string | null;
	dodoSubscriptionId: string | null;
	usage: {
		users: {
			current: number;
			max: number;
			unlimited: boolean;
		};
		patients: {
			current: number;
			max: number;
			unlimited: boolean;
		};
	};
	features: string[];
}

// Cancel subscription validation
export const cancelSubscriptionSchema = z.object({
	body: z.object({
		cancelImmediately: z.boolean().default(false),
		reason: z.string().max(500).optional(),
	}),
});

export type CancelSubscriptionInput = z.infer<
	typeof cancelSubscriptionSchema.shape.body
>;

export interface CancelSubscriptionOutput {
	id: string;
	status: string;
	cancelAtPeriodEnd: boolean;
	currentPeriodEnd: string;
	message: string;
}
