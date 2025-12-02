import {
	type BillingCycleValue,
	Subscription,
	type SubscriptionStatusValue,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("subscriptionBilling");

interface CreateSubscriptionData {
	tenantId: string;
	dodoCustomerId: string;
	dodoSubscriptionId: string;
	dodoProductId: string;
	status: SubscriptionStatusValue;
	billingCycle: BillingCycleValue;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	trialEndsAt?: Date;
	metadata?: Record<string, unknown>;
}

/**
 * Create a new subscription record
 */
export async function createSubscription(data: CreateSubscriptionData) {
	try {
		const id = uuidv4();

		logger.debug(
			{
				id,
				tenantId: data.tenantId,
				dodoSubscriptionId: data.dodoSubscriptionId,
			},
			"Creating subscription",
		);

		const subscription = await Subscription.create({
			_id: id,
			...data,
			cancelAtPeriodEnd: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"subscription",
			{ tenantId: data.tenantId },
			{ _id: subscription._id },
		);

		return subscription;
	} catch (error) {
		logError(logger, error, "Failed to create subscription", {
			tenantId: data.tenantId,
		});
		throw error;
	}
}

interface UpdateSubscriptionData {
	status?: SubscriptionStatusValue;
	dodoProductId?: string;
	billingCycle?: BillingCycleValue;
	currentPeriodStart?: Date;
	currentPeriodEnd?: Date;
	cancelAtPeriodEnd?: boolean;
	trialEndsAt?: Date | null;
	onHoldSince?: Date | null;
	gracePeriodEndsAt?: Date | null;
	cancelledAt?: Date | null;
	cancelledBy?: string | null;
	metadata?: Record<string, unknown>;
}

/**
 * Update subscription by tenant ID
 */
export async function updateSubscriptionByTenantId({
	tenantId,
	data,
}: {
	tenantId: string;
	data: UpdateSubscriptionData;
}) {
	try {
		const subscription = await Subscription.findOneAndUpdate(
			{ tenantId },
			{ ...data, updatedAt: new Date() },
			{ new: true },
		).lean();

		logDatabaseOperation(
			logger,
			"updateOne",
			"subscription",
			{ tenantId },
			{ updated: !!subscription },
		);

		return subscription;
	} catch (error) {
		logError(logger, error, "Failed to update subscription by tenant ID");
		throw error;
	}
}

/**
 * Update subscription by Dodo subscription ID
 */
export async function updateSubscriptionByDodoId({
	dodoSubscriptionId,
	data,
}: {
	dodoSubscriptionId: string;
	data: UpdateSubscriptionData;
}) {
	try {
		const subscription = await Subscription.findOneAndUpdate(
			{ dodoSubscriptionId },
			{ ...data, updatedAt: new Date() },
			{ new: true },
		).lean();

		logDatabaseOperation(
			logger,
			"updateOne",
			"subscription",
			{ dodoSubscriptionId },
			{ updated: !!subscription },
		);

		return subscription;
	} catch (error) {
		logError(logger, error, "Failed to update subscription by Dodo ID");
		throw error;
	}
}

/**
 * Upsert subscription - create or update based on tenantId
 */
export async function upsertSubscription(data: CreateSubscriptionData) {
	try {
		const existing = await Subscription.findOne({ tenantId: data.tenantId });

		if (existing) {
			const subscription = await Subscription.findOneAndUpdate(
				{ tenantId: data.tenantId },
				{
					...data,
					updatedAt: new Date(),
				},
				{ new: true },
			).lean();

			logDatabaseOperation(
				logger,
				"updateOne",
				"subscription",
				{ tenantId: data.tenantId },
				{ updated: true },
			);

			return subscription;
		}

		return createSubscription(data);
	} catch (error) {
		logError(logger, error, "Failed to upsert subscription");
		throw error;
	}
}
