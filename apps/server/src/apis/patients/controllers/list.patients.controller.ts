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
import { listPatientsService } from "../services/list.patients.service";
import type { ListPatientsInput } from "../validations/list.patients.validation";

const logger = createControllerLogger("listPatients");

export const listPatientsController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "List patients request received");

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
	},
);
