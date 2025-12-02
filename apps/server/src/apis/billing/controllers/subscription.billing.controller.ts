import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { getSubscriptionService } from "../services/get-subscription.billing.service";

const logger = createControllerLogger("subscriptionBilling");

/**
 * Get current subscription details
 * GET /api/billing/subscription
 */
export async function getSubscriptionController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		const tenantId = req.user?.tenantId;

		if (!tenantId) {
			return res.status(403).json({
				code: "NO_TENANT",
				message: "No organization associated with your account",
			});
		}

		logger.info({ tenantId }, "Subscription details request received");

		const result = await getSubscriptionService({ tenantId });

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ tenantId, plan: result.plan, status: result.status },
			"Subscription details retrieved",
			duration,
		);

		res.status(200).json(result);
	} catch (error: unknown) {
		const duration = Date.now() - startTime;

		if (
			error &&
			typeof error === "object" &&
			"status" in error &&
			"code" in error
		) {
			const err = error as { status: number; code: string; message: string };

			logger.warn(
				{ errorCode: err.code, errorMessage: err.message, duration },
				"Subscription request failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		logError(logger, error, "Unexpected error getting subscription", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}
