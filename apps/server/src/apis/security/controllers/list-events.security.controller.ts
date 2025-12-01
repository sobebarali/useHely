import type { Request, Response } from "express";
import {
	createControllerLogger,
	logError,
	logSuccess,
} from "../../../lib/logger";
import { listEvents } from "../services/list-events.security.service";
import type { ListEventsInput } from "../validations/list-events.security.validation";

const logger = createControllerLogger("listSecurityEvents");

export async function listEventsController(req: Request, res: Response) {
	const startTime = Date.now();

	try {
		logger.debug("List security events request received");

		// Filters come from validated query params
		const filters = req.query as unknown as ListEventsInput;

		const result = await listEvents(filters);

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				total: result.pagination.total,
				page: result.pagination.page,
				pages: result.pagination.pages,
			},
			"Security events listed successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: {
				events: result.events,
				pagination: result.pagination,
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
				"List security events failed",
			);

			return res.status(err.status).json({
				code: err.code,
				message: err.message,
			});
		}

		// Log unexpected errors
		logError(logger, error, "Unexpected error listing security events", {
			duration,
		});

		res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
		});
	}
}
