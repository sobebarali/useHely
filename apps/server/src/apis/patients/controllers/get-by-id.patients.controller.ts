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
import { getPatientByIdService } from "../services/get-by-id.patients.service";
import type { GetPatientByIdParams } from "../validations/get-by-id.patients.validation";

const logger = createControllerLogger("getPatientById");

export const getPatientByIdController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();
		const { id } = req.params as GetPatientByIdParams;

		logInput(logger, { id }, "Get patient request received");

		const result = await getPatientByIdService({
			tenantId: req.user.tenantId,
			patientId: id,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				patientId: result.patientId,
			},
			"Patient retrieved successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
