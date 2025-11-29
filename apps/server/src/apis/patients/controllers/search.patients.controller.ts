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
import { searchPatientsService } from "../services/search.patients.service";
import type { SearchPatientsInput } from "../validations/search.patients.validation";

const logger = createControllerLogger("searchPatients");

export const searchPatientsController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "Search patients request received");

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
	},
);
