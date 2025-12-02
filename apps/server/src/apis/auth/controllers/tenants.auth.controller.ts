import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { listUserTenants } from "../services/tenants.auth.service";

const logger = createControllerLogger("tenantsAuth");

/**
 * GET /api/auth/tenants
 * List all tenants the authenticated user belongs to
 */
export async function listUserTenantsController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.info("List user tenants request received");

		const userId = req.user?.id;
		const currentTenantId = req.user?.tenantId;

		if (!userId || !currentTenantId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const result = await listUserTenants({
			userId,
			currentTenantId,
		});

		const duration = Date.now() - startTime;
		logSuccess(
			logger,
			{ tenantCount: result.tenants.length },
			"User tenants listed successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error: unknown) {
		const duration = Date.now() - startTime;

		// Handle known business errors
		if (
			error &&
			typeof error === "object" &&
			"status" in error &&
			"code" in error
		) {
			const err = error as { status: number; code: string; message: string };
			logger.warn(
				{ errorCode: err.code, errorMessage: err.message, duration },
				"List user tenants failed",
			);
			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error listing user tenants", {
			duration,
		});
		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}
