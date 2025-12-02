/**
 * Checkout controllers using @dodopayments/express adapter
 *
 * Provides three checkout methods:
 * - Static (GET): Simple checkout via query params
 * - Dynamic (POST): Full control with JSON body
 * - Session (POST): Most secure, creates checkout session
 */

import { checkoutHandler } from "@dodopayments/express";
import { Hospital } from "@hms/db";
import type { Request, Response } from "express";
import {
	DodoConfig,
	DodoProducts,
	getProductIdFromTier,
} from "../../../constants/billing.constants";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";

const logger = createControllerLogger("checkoutBilling");

/**
 * Static checkout handler (GET)
 * Uses query parameters: productId, email, fullName, metadata_*
 *
 * GET /api/billing/checkout?productId=pdt_xxx
 *
 * The adapter automatically:
 * - Validates query parameters
 * - Creates checkout URL with Dodo API
 * - Returns { checkout_url: "..." }
 */
export async function staticCheckoutController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		const tenantId = req.user?.tenantId;

		if (!tenantId) {
			return res.status(403).json({
				code: "NO_TENANT",
				message: "No organization associated with your account",
			});
		}

		// Get tenant info to inject into checkout
		const tenant = await Hospital.findById(tenantId).lean();

		if (!tenant) {
			return res.status(404).json({
				code: "TENANT_NOT_FOUND",
				message: "Organization not found",
			});
		}

		// Handle plan/cycle shorthand - convert to productId
		const plan = req.query.plan as string | undefined;
		const cycle = (req.query.cycle as string) || "MONTHLY";

		if (plan && !req.query.productId) {
			const productId = getProductIdFromTier(
				plan as "STARTER" | "PROFESSIONAL",
				cycle as "MONTHLY" | "YEARLY",
			);
			if (productId) {
				req.query.productId = productId;
			} else {
				return res.status(400).json({
					code: "INVALID_PLAN",
					message: `No product configured for plan ${plan} with cycle ${cycle}`,
				});
			}
		}

		// Validate productId is provided
		if (!req.query.productId) {
			return res.status(400).json({
				code: "MISSING_PRODUCT",
				message: "productId or plan is required",
			});
		}

		// Inject tenant metadata into query params for webhook correlation
		req.query.metadata_tenantId = tenantId;
		req.query.metadata_organizationName = tenant.name;

		// Pre-fill customer info if available
		if (tenant.adminEmail && !req.query.email) {
			req.query.email = tenant.adminEmail;
		}
		if (tenant.name && !req.query.fullName) {
			req.query.fullName = tenant.name;
		}

		logger.info(
			{ tenantId, productId: req.query.productId },
			"Static checkout initiated",
		);

		// Delegate to Dodo adapter
		const handler = checkoutHandler({
			bearerToken: DodoConfig.apiKey,
			environment: DodoConfig.environment,
			returnUrl: DodoConfig.returnUrl,
			type: "static",
		});

		// The adapter returns the response directly
		const result = await handler(req, res);

		const duration = Date.now() - startTime;
		logSuccess(
			logger,
			{ tenantId, productId: req.query.productId },
			"Static checkout URL created",
			duration,
		);

		return result;
	} catch (error: unknown) {
		const duration = Date.now() - startTime;
		logError(logger, error, "Static checkout failed", { duration });

		return res.status(500).json({
			code: "CHECKOUT_FAILED",
			message: "Failed to create checkout link",
		});
	}
}

/**
 * Dynamic checkout handler (POST)
 * Full control with JSON body including customer, billing, metadata
 *
 * POST /api/billing/checkout
 * Body: {
 *   product_id: "pdt_xxx",
 *   quantity: 1,
 *   customer: { email: "...", name: "..." },
 *   billing: { city, country, state, street, zipcode },
 *   metadata: { tenantId: "..." }
 * }
 */
export async function dynamicCheckoutController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		const tenantId = req.user?.tenantId;

		if (!tenantId) {
			return res.status(403).json({
				code: "NO_TENANT",
				message: "No organization associated with your account",
			});
		}

		// Get tenant info
		const tenant = await Hospital.findById(tenantId).lean();

		if (!tenant) {
			return res.status(404).json({
				code: "TENANT_NOT_FOUND",
				message: "Organization not found",
			});
		}

		// Handle plan/cycle shorthand in body
		const body = req.body || {};
		if (body.plan && !body.product_id) {
			const productId = getProductIdFromTier(
				body.plan as "STARTER" | "PROFESSIONAL",
				(body.cycle as "MONTHLY" | "YEARLY") || "MONTHLY",
			);
			if (productId) {
				body.product_id = productId;
			} else {
				return res.status(400).json({
					code: "INVALID_PLAN",
					message: `No product configured for plan ${body.plan}`,
				});
			}
		}

		// Inject tenant metadata
		req.body.metadata = {
			...body.metadata,
			tenantId,
			organizationName: tenant.name,
		};

		// Pre-fill customer if not provided
		if (!req.body.customer) {
			req.body.customer = {};
		}
		if (!req.body.customer.email && tenant.adminEmail) {
			req.body.customer.email = tenant.adminEmail;
		}
		if (!req.body.customer.name && tenant.name) {
			req.body.customer.name = tenant.name;
		}

		// If customer_id exists from previous purchases, include it
		if (tenant.dodoCustomerId && !req.body.customer.customer_id) {
			req.body.customer.customer_id = tenant.dodoCustomerId;
		}

		logger.info(
			{ tenantId, productId: body.product_id },
			"Dynamic checkout initiated",
		);

		// Delegate to Dodo adapter
		const handler = checkoutHandler({
			bearerToken: DodoConfig.apiKey,
			environment: DodoConfig.environment,
			returnUrl: DodoConfig.returnUrl,
			type: "dynamic",
		});

		const result = await handler(req, res);

		const duration = Date.now() - startTime;
		logSuccess(
			logger,
			{ tenantId, productId: body.product_id },
			"Dynamic checkout URL created",
			duration,
		);

		return result;
	} catch (error: unknown) {
		const duration = Date.now() - startTime;
		logError(logger, error, "Dynamic checkout failed", { duration });

		return res.status(500).json({
			code: "CHECKOUT_FAILED",
			message: "Failed to create checkout link",
		});
	}
}

/**
 * Session checkout handler (POST) - RECOMMENDED
 * Most secure, creates a checkout session with product cart
 *
 * POST /api/billing/checkout/session
 * Body: {
 *   product_cart: [{ product_id: "pdt_xxx", quantity: 1 }],
 *   customer: { email: "...", name: "..." },
 *   return_url: "https://..."
 * }
 */
export async function sessionCheckoutController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		const tenantId = req.user?.tenantId;

		if (!tenantId) {
			return res.status(403).json({
				code: "NO_TENANT",
				message: "No organization associated with your account",
			});
		}

		// Get tenant info
		const tenant = await Hospital.findById(tenantId).lean();

		if (!tenant) {
			return res.status(404).json({
				code: "TENANT_NOT_FOUND",
				message: "Organization not found",
			});
		}

		const body = req.body || {};

		// Handle plan/cycle shorthand - convert to product_cart
		if (body.plan && !body.product_cart) {
			const productId = getProductIdFromTier(
				body.plan as "STARTER" | "PROFESSIONAL",
				(body.cycle as "MONTHLY" | "YEARLY") || "MONTHLY",
			);
			if (productId) {
				body.product_cart = [{ product_id: productId, quantity: 1 }];
			} else {
				return res.status(400).json({
					code: "INVALID_PLAN",
					message: `No product configured for plan ${body.plan}`,
				});
			}
		}

		// Validate product_cart is provided
		if (!body.product_cart || body.product_cart.length === 0) {
			return res.status(400).json({
				code: "MISSING_PRODUCT",
				message: "product_cart or plan is required",
			});
		}

		// Inject tenant metadata
		req.body.metadata = {
			...body.metadata,
			tenantId,
			organizationName: tenant.name,
		};

		// Pre-fill customer if not provided
		if (!req.body.customer) {
			req.body.customer = {};
		}
		if (!req.body.customer.email && tenant.adminEmail) {
			req.body.customer.email = tenant.adminEmail;
		}
		if (!req.body.customer.name && tenant.name) {
			req.body.customer.name = tenant.name;
		}

		// If customer_id exists from previous purchases, include it
		if (tenant.dodoCustomerId && !req.body.customer.customer_id) {
			req.body.customer.customer_id = tenant.dodoCustomerId;
		}

		// Set return URL if not provided
		if (!req.body.return_url && DodoConfig.returnUrl) {
			req.body.return_url = DodoConfig.returnUrl;
		}

		logger.info(
			{ tenantId, productCart: body.product_cart },
			"Session checkout initiated",
		);

		// Delegate to Dodo adapter
		const handler = checkoutHandler({
			bearerToken: DodoConfig.apiKey,
			environment: DodoConfig.environment,
			returnUrl: DodoConfig.returnUrl,
			type: "session",
		});

		const result = await handler(req, res);

		const duration = Date.now() - startTime;
		logSuccess(
			logger,
			{ tenantId, productCart: body.product_cart },
			"Session checkout URL created",
			duration,
		);

		return result;
	} catch (error: unknown) {
		const duration = Date.now() - startTime;
		logError(logger, error, "Session checkout failed", { duration });

		return res.status(500).json({
			code: "CHECKOUT_FAILED",
			message: "Failed to create checkout session",
		});
	}
}

/**
 * Get available subscription plans
 * GET /api/billing/plans
 */
export async function getPlansController(_req: Request, res: Response) {
	const startTime = Date.now();

	try {
		const plans = [
			{
				id: "STARTER",
				name: "Starter",
				description: "Perfect for small clinics and practices",
				monthlyProductId: DodoProducts.STARTER_MONTHLY || null,
				yearlyProductId: DodoProducts.STARTER_YEARLY || null,
				features: [
					"Up to 5 staff users",
					"1,000 patients",
					"OPD management",
					"Basic reporting",
				],
			},
			{
				id: "PROFESSIONAL",
				name: "Professional",
				description: "For growing practices with full operations",
				monthlyProductId: DodoProducts.PROFESSIONAL_MONTHLY || null,
				yearlyProductId: DodoProducts.PROFESSIONAL_YEARLY || null,
				features: [
					"Up to 50 staff users",
					"Unlimited patients",
					"OPD + IPD management",
					"Pharmacy & inventory",
					"Advanced analytics",
					"API access",
				],
			},
		];

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ planCount: plans.length },
			"Plans retrieved",
			duration,
		);

		res.status(200).json({ plans });
	} catch (error: unknown) {
		const duration = Date.now() - startTime;

		logError(logger, error, "Failed to get plans", { duration });

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}
