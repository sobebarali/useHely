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
import { listPrescriptionsService } from "../services/list.prescriptions.service";
import type { ListPrescriptionsInput } from "../validations/list.prescriptions.validation";

const logger = createControllerLogger("listPrescriptions");

export const listPrescriptionsController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "List prescriptions request received");

		const result = await listPrescriptionsService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as ListPrescriptionsInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				count: result.data.length,
				total: result.pagination.total,
			},
			"Prescriptions listed successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
