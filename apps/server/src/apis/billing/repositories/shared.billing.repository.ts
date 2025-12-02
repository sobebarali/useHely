import { Hospital, type PricingTierValue, Subscription } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("sharedBilling");

/**
 * Find subscription by tenant ID
 */
export async function findSubscriptionByTenantId({
	tenantId,
}: {
	tenantId: string;
}) {
	try {
		const subscription = await Subscription.findOne({ tenantId }).lean();
		logDatabaseOperation(
			logger,
			"findOne",
			"subscription",
			{ tenantId },
			{ found: !!subscription },
		);
		return subscription;
	} catch (error) {
		logError(logger, error, "Failed to find subscription by tenant ID");
		throw error;
	}
}

/**
 * Find subscription by Dodo subscription ID
 */
export async function findSubscriptionByDodoId({
	dodoSubscriptionId,
}: {
	dodoSubscriptionId: string;
}) {
	try {
		const subscription = await Subscription.findOne({
			dodoSubscriptionId,
		}).lean();
		logDatabaseOperation(
			logger,
			"findOne",
			"subscription",
			{ dodoSubscriptionId },
			{ found: !!subscription },
		);
		return subscription;
	} catch (error) {
		logError(logger, error, "Failed to find subscription by Dodo ID");
		throw error;
	}
}

/**
 * Find tenant by Dodo customer ID
 */
export async function findTenantByDodoCustomerId({
	dodoCustomerId,
}: {
	dodoCustomerId: string;
}) {
	try {
		const tenant = await Hospital.findOne({ dodoCustomerId }).lean();
		logDatabaseOperation(
			logger,
			"findOne",
			"hospital",
			{ dodoCustomerId },
			{ found: !!tenant },
		);
		return tenant;
	} catch (error) {
		logError(logger, error, "Failed to find tenant by Dodo customer ID");
		throw error;
	}
}

/**
 * Update tenant's Dodo customer ID
 */
export async function updateTenantDodoCustomerId({
	tenantId,
	dodoCustomerId,
}: {
	tenantId: string;
	dodoCustomerId: string;
}) {
	try {
		const tenant = await Hospital.findByIdAndUpdate(
			tenantId,
			{ dodoCustomerId },
			{ new: true },
		).lean();
		logDatabaseOperation(
			logger,
			"updateOne",
			"hospital",
			{ tenantId },
			{ updated: !!tenant },
		);
		return tenant;
	} catch (error) {
		logError(logger, error, "Failed to update tenant Dodo customer ID");
		throw error;
	}
}

/**
 * Update tenant's pricing tier
 */
export async function updateTenantPricingTier({
	tenantId,
	pricingTier,
}: {
	tenantId: string;
	pricingTier: PricingTierValue;
}) {
	try {
		const tenant = await Hospital.findByIdAndUpdate(
			tenantId,
			{ pricingTier },
			{ new: true },
		).lean();
		logDatabaseOperation(
			logger,
			"updateOne",
			"hospital",
			{ tenantId, pricingTier },
			{ updated: !!tenant },
		);
		return tenant;
	} catch (error) {
		logError(logger, error, "Failed to update tenant pricing tier");
		throw error;
	}
}
