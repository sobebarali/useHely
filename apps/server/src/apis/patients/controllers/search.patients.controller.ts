import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { searchPatientsService } from "../services/search.patients.service";
import type { SearchPatientsInput } from "../validations/search.patients.validation";

const logger = createControllerLogger("searchPatients");

export async function searchPatientsController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logInput(logger, req.query, "Search patients request received");

		// User should be set by authenticate middleware
		if (!req.user?.id || !req.user.tenantId) {
			logger.warn("No user or tenant found in request");
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		const result = await searchPatientsService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as SearchPatientsInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				count: result.count,
			},
			"Patients search completed",
			duration,
		);

		res.status(200).json({
			results: result.results,
			count: result.count,
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
				"Search patients failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error searching patients", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}
