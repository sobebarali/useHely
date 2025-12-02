import { CustomerPortal } from "@dodopayments/express";
import { Hospital } from "@hms/db";
import type { Request, Response } from "express";
import { DodoConfig } from "../../../constants/billing.constants";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";

const logger = createControllerLogger("portalBilling");

// Create the CustomerPortal handler once
const customerPortalHandler = CustomerPortal({
	bearerToken: DodoConfig.apiKey,
	environment: DodoConfig.environment,
});

/**
 * Get Dodo customer portal link
 * GET /api/billing/portal
 *
 * Maps tenantId → dodoCustomerId and redirects to Dodo portal
 * Query params:
 *   - send_email (optional): Boolean to send portal link via email
 */
export async function portalController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		const tenantId = req.user?.tenantId;
		const userId = req.user?.id;

		if (!tenantId || !userId) {
			return res.status(403).json({
				code: "NO_TENANT",
				message: "No organization associated with your account",
			});
		}

		logger.info(
			{ tenantId, sendEmail: req.query.send_email },
			"Portal link request received",
		);

		// Look up the dodoCustomerId from the tenant
		const tenant = await Hospital.findById(tenantId)
			.select("dodoCustomerId")
			.lean();

		if (!tenant) {
			return res.status(404).json({
				code: "TENANT_NOT_FOUND",
				message: "Organization not found",
			});
		}

		if (!tenant.dodoCustomerId) {
			return res.status(400).json({
				code: "NO_BILLING_ACCOUNT",
				message: "No billing account found. Please subscribe to a plan first.",
			});
		}

		// Inject the customer_id into query params for the adapter
		req.query.customer_id = tenant.dodoCustomerId;

		const duration = Date.now() - startTime;
		logSuccess(logger, { tenantId }, "Portal redirect initiated", duration);

		// Let the adapter handle the redirect to Dodo portal
		return customerPortalHandler(req, res);
	} catch (error: unknown) {
		const duration = Date.now() - startTime;

		logError(logger, error, "Unexpected error getting portal link", {
			duration,
		});

		return res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}
