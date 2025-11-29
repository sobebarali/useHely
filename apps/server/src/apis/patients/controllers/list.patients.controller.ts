import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { listPatientsService } from "../services/list.patients.service";
import type { ListPatientsInput } from "../validations/list.patients.validation";

const logger = createControllerLogger("listPatients");

export async function listPatientsController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logInput(logger, req.query, "List patients request received");

		// User should be set by authenticate middleware
		if (!req.user?.id || !req.user.tenantId) {
			logger.warn("No user or tenant found in request");
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const result = await listPatientsService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as ListPatientsInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				count: result.data.length,
				total: result.total,
			},
			"Patients listed successfully",
			duration,
		);

		res.status(200).json({
			data: result.data,
			pagination: {
				page: result.page,
				limit: result.limit,
				total: result.total,
				totalPages: result.totalPages,
			},
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
				{
					errorCode: err.code,
					errorMessage: err.message,
					duration,
				},
				"List patients failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error listing patients", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}
