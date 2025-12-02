/**
 * Billing routes
 *
 * GET  /api/billing/subscription - Get current subscription details
 * GET  /api/billing/checkout - Static checkout (query params)
 * POST /api/billing/checkout - Dynamic checkout (JSON body)
 * POST /api/billing/checkout/session - Session checkout (recommended)
 * GET  /api/billing/plans - Get available subscription plans
 * GET  /api/billing/portal - Get customer portal link
 * POST /api/billing/webhook - Handle Dodo Payments webhooks
 */

import { Webhooks } from "@dodopayments/express";
import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import {
	dynamicCheckoutController,
	getPlansController,
	sessionCheckoutController,
	staticCheckoutController,
} from "./controllers/checkout.billing.controller";
import { portalController } from "./controllers/portal.billing.controller";
import { getSubscriptionController } from "./controllers/subscription.billing.controller";
import {
	onPaymentFailed,
	onPaymentSucceeded,
	onSubscriptionActive,
	onSubscriptionCancelled,
	onSubscriptionExpired,
	onSubscriptionFailed,
	onSubscriptionOnHold,
	onSubscriptionPlanChanged,
	onSubscriptionRenewed,
} from "./services/webhook-handlers.billing";

const router = Router();

// Public routes (no auth required)
// GET /api/billing/plans - Get available plans (public for pricing page)
router.get("/plans", getPlansController);

// POST /api/billing/webhook - Dodo webhook endpoint with automatic signature verification
// Only register when webhook key is configured and valid (required for Base64 decoding)
// The webhook key must be a valid Base64 string from Dodo dashboard
const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
const isValidWebhookKey = webhookKey && webhookKey.length > 20; // Basic validation
if (isValidWebhookKey) {
	router.post(
		"/webhook",
		Webhooks({
			webhookKey,
			onSubscriptionActive,
			onSubscriptionOnHold,
			onSubscriptionCancelled,
			onSubscriptionExpired,
			onSubscriptionRenewed,
			onSubscriptionPlanChanged,
			onSubscriptionFailed,
			onPaymentSucceeded,
			onPaymentFailed,
		}),
	);
}

// Protected routes (require authentication)
// GET /api/billing/subscription - Get current subscription
router.get(
	"/subscription",
	authenticate,
	authorize("SUBSCRIPTION:READ"),
	getSubscriptionController,
);

// GET /api/billing/checkout - Static checkout via query params
// Example: /api/billing/checkout?productId=pdt_xxx&email=user@example.com
router.get(
	"/checkout",
	authenticate,
	authorize("BILLING:MANAGE"),
	staticCheckoutController,
);

// POST /api/billing/checkout - Dynamic checkout with JSON body
// Provides full control over checkout parameters
router.post(
	"/checkout",
	authenticate,
	authorize("BILLING:MANAGE"),
	dynamicCheckoutController,
);

// POST /api/billing/checkout/session - Session checkout (recommended)
// Most secure, creates a checkout session with product cart
router.post(
	"/checkout/session",
	authenticate,
	authorize("BILLING:MANAGE"),
	sessionCheckoutController,
);

// GET /api/billing/portal - Get customer portal link
router.get(
	"/portal",
	authenticate,
	authorize("BILLING:READ"),
	portalController,
);

export default router;
