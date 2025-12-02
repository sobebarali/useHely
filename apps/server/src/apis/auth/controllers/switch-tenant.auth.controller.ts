import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { switchTenant } from "../services/switch-tenant.auth.service";
import type { SwitchTenantInput } from "../validations/switch-tenant.auth.validation";

const logger = createControllerLogger("switchTenantAuth");

export async function switchTenantController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.info(
			{ targetTenantId: req.body.tenant_id },
			"Tenant switch request received",
		);

		const data = req.body as SwitchTenantInput;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		// Extract current token from Authorization header
		const authHeader = req.headers.authorization;
		const currentToken = authHeader?.split(" ")[1];

		if (!currentToken) {
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "No token provided",
			});
		}

		const result = await switchTenant({
			data,
			userId,
			currentToken,
			ipAddress: req.ip,
			userAgent: req.headers["user-agent"],
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ targetTenantId: result.tenant.id },
			"Tenant switch successful",
			duration,
		);

		res.status(200).json(result);
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
				{
					errorCode: err.code,
					errorMessage: err.message,
					duration,
				},
				"Tenant switch failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error during tenant switch", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}
