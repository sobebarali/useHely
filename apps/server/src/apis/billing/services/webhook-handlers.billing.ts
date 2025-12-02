/**
 * Webhook handlers for Dodo Payments events
 *
 * These handlers are used with the @dodopayments/express Webhooks adapter.
 * Each handler receives a typed WebhookPayload and processes the event.
 */

import { getTierFromProductId } from "../../../constants/billing.constants";
import { createServiceLogger } from "../../../lib/logger";
import { calculateGracePeriodEnd } from "../../../middlewares/check-subscription";
import {
	findSubscriptionByDodoId,
	findTenantByDodoCustomerId,
	updateTenantDodoCustomerId,
	updateTenantPricingTier,
} from "../repositories/shared.billing.repository";
import {
	updateSubscriptionByDodoId,
	upsertSubscription,
} from "../repositories/subscription.billing.repository";

const logger = createServiceLogger("webhook-handlers");

/**
 * Subscription payload from Dodo webhook
 */
interface SubscriptionPayload {
	type: string;
	timestamp: Date;
	business_id: string;
	data: {
		payload_type: "Subscription";
		subscription_id: string;
		product_id: string;
		status: string;
		customer: {
			customer_id: string;
			email: string;
			name: string | null;
		};
		metadata: Record<string, unknown> | null;
		created_at: Date;
		cancelled_at: Date | null;
		cancel_at_next_billing_date: boolean;
		next_billing_date: Date | null;
		previous_billing_date: Date | null;
		payment_frequency_interval: "Day" | "Week" | "Month" | "Year";
		payment_frequency_count: number;
		trial_period_days: number;
	};
}

/**
 * Payment payload from Dodo webhook
 */
interface PaymentPayload {
	type: string;
	timestamp: Date;
	business_id: string;
	data: {
		payload_type: "Payment";
		payment_id: string;
		status: string;
		subscription_id: string | null;
		customer: {
			customer_id: string;
			email: string;
			name: string | null;
		};
		metadata: Record<string, unknown> | null;
		total_amount: number;
		currency: string;
	};
}

/**
 * Determine billing cycle from payment frequency
 */
function getBillingCycle(
	interval: "Day" | "Week" | "Month" | "Year",
	count: number,
): "MONTHLY" | "YEARLY" {
	if (interval === "Year" || (interval === "Month" && count >= 12)) {
		return "YEARLY";
	}
	return "MONTHLY";
}

/**
 * Handle subscription.active event
 * Creates or updates subscription record and upgrades tenant tier
 */
export async function onSubscriptionActive(
	payload: SubscriptionPayload,
): Promise<void> {
	const { data } = payload;
	const {
		subscription_id,
		product_id,
		customer,
		metadata,
		next_billing_date,
		previous_billing_date,
		payment_frequency_interval,
		payment_frequency_count,
		trial_period_days,
	} = data;

	logger.info(
		{ subscriptionId: subscription_id, productId: product_id },
		"Processing subscription.active event",
	);

	// Find tenant by customer ID or metadata
	let tenantId = metadata?.tenantId as string | undefined;

	if (!tenantId) {
		const tenant = await findTenantByDodoCustomerId({
			dodoCustomerId: customer.customer_id,
		});
		tenantId = tenant?._id ?? undefined;
	}

	if (!tenantId) {
		// Store customer ID for later linking if tenant not found
		logger.warn(
			{ customerId: customer.customer_id },
			"Tenant not found for subscription.active - customer may need manual linking",
		);
		return;
	}

	// Link customer ID to tenant if not already linked
	await updateTenantDodoCustomerId({
		tenantId,
		dodoCustomerId: customer.customer_id,
	});

	// Determine tier from product ID
	const tier = getTierFromProductId(product_id);
	const billingCycle = getBillingCycle(
		payment_frequency_interval,
		payment_frequency_count,
	);

	// Calculate period dates
	const currentPeriodStart = previous_billing_date || new Date();
	const currentPeriodEnd = next_billing_date || new Date();

	// Calculate trial end date if applicable
	let trialEndsAt: Date | undefined;
	if (trial_period_days > 0) {
		trialEndsAt = new Date();
		trialEndsAt.setDate(trialEndsAt.getDate() + trial_period_days);
	}

	// Create/update subscription record
	await upsertSubscription({
		tenantId,
		dodoCustomerId: customer.customer_id,
		dodoSubscriptionId: subscription_id,
		dodoProductId: product_id,
		status: "ACTIVE",
		billingCycle,
		currentPeriodStart,
		currentPeriodEnd,
		trialEndsAt: trialEndsAt ?? undefined,
	});

	// Update tenant's pricing tier
	if (tier) {
		await updateTenantPricingTier({ tenantId, pricingTier: tier });
	}

	logger.info(
		{
			tenantId,
			subscriptionId: subscription_id,
			tier,
			status: "ACTIVE",
		},
		"Subscription activated",
	);
}

/**
 * Handle subscription.on_hold event
 * Payment failed - subscription is paused, start grace period
 */
export async function onSubscriptionOnHold(
	payload: SubscriptionPayload,
): Promise<void> {
	const { data } = payload;
	const { subscription_id } = data;

	logger.info(
		{ subscriptionId: subscription_id },
		"Processing subscription.on_hold event",
	);

	const subscription = await findSubscriptionByDodoId({
		dodoSubscriptionId: subscription_id,
	});

	if (!subscription) {
		logger.warn(
			{ subscriptionId: subscription_id },
			"Subscription not found for on_hold event",
		);
		return;
	}

	const onHoldSince = new Date();
	const gracePeriodEndsAt = calculateGracePeriodEnd(onHoldSince);

	await updateSubscriptionByDodoId({
		dodoSubscriptionId: subscription_id,
		data: {
			status: "ON_HOLD",
			onHoldSince,
			gracePeriodEndsAt,
		},
	});

	logger.info(
		{
			tenantId: subscription.tenantId,
			subscriptionId: subscription_id,
			gracePeriodEndsAt,
		},
		"Subscription on hold - grace period started",
	);

	// TODO: Send notification email to tenant about payment failure
}

/**
 * Handle subscription.cancelled event
 */
export async function onSubscriptionCancelled(
	payload: SubscriptionPayload,
): Promise<void> {
	const { data } = payload;
	const { subscription_id, cancelled_at, cancel_at_next_billing_date } = data;

	logger.info(
		{ subscriptionId: subscription_id },
		"Processing subscription.cancelled event",
	);

	const subscription = await findSubscriptionByDodoId({
		dodoSubscriptionId: subscription_id,
	});

	if (!subscription) {
		logger.warn(
			{ subscriptionId: subscription_id },
			"Subscription not found for cancelled event",
		);
		return;
	}

	await updateSubscriptionByDodoId({
		dodoSubscriptionId: subscription_id,
		data: {
			status: "CANCELLED",
			cancelledAt: cancelled_at || new Date(),
			cancelAtPeriodEnd: cancel_at_next_billing_date,
		},
	});

	// If cancelled immediately (not at period end), downgrade to FREE
	if (!cancel_at_next_billing_date) {
		await updateTenantPricingTier({
			tenantId: subscription.tenantId,
			pricingTier: "FREE",
		});
	}

	logger.info(
		{
			tenantId: subscription.tenantId,
			subscriptionId: subscription_id,
			cancelAtPeriodEnd: cancel_at_next_billing_date,
		},
		"Subscription cancelled",
	);
}

/**
 * Handle subscription.expired event
 */
export async function onSubscriptionExpired(
	payload: SubscriptionPayload,
): Promise<void> {
	const { data } = payload;
	const { subscription_id } = data;

	logger.info(
		{ subscriptionId: subscription_id },
		"Processing subscription.expired event",
	);

	const subscription = await findSubscriptionByDodoId({
		dodoSubscriptionId: subscription_id,
	});

	if (!subscription) {
		logger.warn(
			{ subscriptionId: subscription_id },
			"Subscription not found for expired event",
		);
		return;
	}

	await updateSubscriptionByDodoId({
		dodoSubscriptionId: subscription_id,
		data: {
			status: "EXPIRED",
		},
	});

	// Downgrade tenant to FREE tier
	await updateTenantPricingTier({
		tenantId: subscription.tenantId,
		pricingTier: "FREE",
	});

	logger.info(
		{
			tenantId: subscription.tenantId,
			subscriptionId: subscription_id,
		},
		"Subscription expired - downgraded to FREE tier",
	);
}

/**
 * Handle subscription.renewed event
 */
export async function onSubscriptionRenewed(
	payload: SubscriptionPayload,
): Promise<void> {
	const { data } = payload;
	const { subscription_id, next_billing_date, previous_billing_date } = data;

	logger.info(
		{ subscriptionId: subscription_id },
		"Processing subscription.renewed event",
	);

	await updateSubscriptionByDodoId({
		dodoSubscriptionId: subscription_id,
		data: {
			status: "ACTIVE",
			currentPeriodStart: previous_billing_date || new Date(),
			currentPeriodEnd: next_billing_date || undefined,
			onHoldSince: undefined,
			gracePeriodEndsAt: undefined,
		},
	});

	logger.info(
		{ subscriptionId: subscription_id, nextBillingDate: next_billing_date },
		"Subscription renewed",
	);
}

/**
 * Handle subscription.plan_changed event
 */
export async function onSubscriptionPlanChanged(
	payload: SubscriptionPayload,
): Promise<void> {
	const { data } = payload;
	const {
		subscription_id,
		product_id,
		next_billing_date,
		previous_billing_date,
		payment_frequency_interval,
		payment_frequency_count,
	} = data;

	logger.info(
		{ subscriptionId: subscription_id, productId: product_id },
		"Processing subscription.plan_changed event",
	);

	const subscription = await findSubscriptionByDodoId({
		dodoSubscriptionId: subscription_id,
	});

	if (!subscription) {
		logger.warn(
			{ subscriptionId: subscription_id },
			"Subscription not found for plan_changed event",
		);
		return;
	}

	// Determine new tier from product ID
	const newTier = getTierFromProductId(product_id);
	const billingCycle = getBillingCycle(
		payment_frequency_interval,
		payment_frequency_count,
	);

	await updateSubscriptionByDodoId({
		dodoSubscriptionId: subscription_id,
		data: {
			dodoProductId: product_id,
			billingCycle,
			currentPeriodStart: previous_billing_date || undefined,
			currentPeriodEnd: next_billing_date || undefined,
		},
	});

	// Update tenant's pricing tier
	if (newTier) {
		await updateTenantPricingTier({
			tenantId: subscription.tenantId,
			pricingTier: newTier,
		});
	}

	logger.info(
		{
			tenantId: subscription.tenantId,
			subscriptionId: subscription_id,
			oldProductId: subscription.dodoProductId,
			newProductId: product_id,
			newTier,
		},
		"Subscription plan changed",
	);
}

/**
 * Handle subscription.failed event
 */
export async function onSubscriptionFailed(
	payload: SubscriptionPayload,
): Promise<void> {
	const { data } = payload;
	const { subscription_id } = data;

	logger.warn(
		{ subscriptionId: subscription_id },
		"Subscription failed event received",
	);

	// Similar to on_hold - the subscription couldn't be renewed
	await onSubscriptionOnHold(payload);
}

/**
 * Handle payment.succeeded event
 */
export async function onPaymentSucceeded(
	payload: PaymentPayload,
): Promise<void> {
	const { data } = payload;
	const { payment_id, subscription_id, customer, total_amount, currency } =
		data;

	logger.info(
		{
			paymentId: payment_id,
			subscriptionId: subscription_id,
			customerId: customer.customer_id,
			amount: total_amount,
			currency,
		},
		"Payment succeeded",
	);

	// Payment success is primarily for logging
	// Subscription status updates are handled by subscription.* events
}

/**
 * Handle payment.failed event
 */
export async function onPaymentFailed(payload: PaymentPayload): Promise<void> {
	const { data } = payload;
	const { payment_id, subscription_id, customer } = data;

	logger.warn(
		{
			paymentId: payment_id,
			subscriptionId: subscription_id,
			customerId: customer.customer_id,
		},
		"Payment failed",
	);

	// Subscription status will be updated via subscription.on_hold event
	// TODO: Send notification email about payment failure
}
