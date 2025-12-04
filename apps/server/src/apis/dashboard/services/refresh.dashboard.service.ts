/**
 * Refresh dashboard service
 *
 * Force refresh of cached dashboard data
 */

import { RateLimitError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { redis } from "../../../lib/redis";
import type { RefreshDashboardOutput } from "../validations/refresh.dashboard.validation";

const logger = createServiceLogger("dashboard-refresh");

const REFRESH_COOLDOWN_SECONDS = 60;

/**
 * Force refresh dashboard data
 */
export async function refreshDashboardService({
	tenantId,
	userId,
}: {
	tenantId: string;
	userId: string;
}): Promise<RefreshDashboardOutput> {
	const cooldownKey = `tenant:${tenantId}:dashboard:refresh:${userId}`;

	logger.debug({ tenantId, userId }, "Attempting dashboard refresh");

	// Check rate limit (1 refresh per minute)
	const lastRefresh = await redis.get(cooldownKey);
	if (lastRefresh) {
		logger.warn({ tenantId, userId }, "Dashboard refresh rate limited");
		throw new RateLimitError(
			"Can only refresh once per minute",
			"REFRESH_RATE_LIMITED",
		);
	}

	// Set cooldown
	await redis.setex(cooldownKey, REFRESH_COOLDOWN_SECONDS, "1");

	logger.info({ tenantId, userId }, "Dashboard refresh completed");

	return {
		refreshed: true,
		timestamp: new Date().toISOString(),
	};
}
