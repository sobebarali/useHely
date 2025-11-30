import type { Response } from "express";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "../../../utils/async-handler";
import { getQueueService } from "../services/queue.appointments.service";
import type { GetQueueInput } from "../validations/queue.appointments.validation";

const logger = createControllerLogger("getQueue");

export const getQueueController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "Get queue request received");

		const result = await getQueueService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as GetQueueInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				count: result.queue.length,
			},
			"Queue retrieved successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
