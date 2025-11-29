import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { createRoleService } from "../services/create.roles.service";
import type { CreateRoleInput } from "../validations/create.roles.validation";

const logger = createControllerLogger("createRole");

export async function createRoleController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logInput(logger, req.body, "Create role request received");

		// User should be set by authenticate middleware
		if (!req.user?.id || !req.user.tenantId) {
			logger.warn("No user or tenant found in request");
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const data = req.body as CreateRoleInput;

		const result = await createRoleService({
			tenantId: req.user.tenantId,
			data,
			userRoles: req.user.roles,
			userPermissions: req.user.permissions,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				roleId: result.id,
				name: result.name,
				permissionsCount: result.permissions.length,
			},
			"Role created successfully",
			duration,
		);

		res.status(201).json(result);
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
				"Create role failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Handle mongoose duplicate key errors
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === 11000
		) {
			logger.warn({ duration }, "Duplicate role error");

			return res.status(409).json({
				code: "ROLE_EXISTS",
				message: "A role with this name already exists",
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error creating role", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}
