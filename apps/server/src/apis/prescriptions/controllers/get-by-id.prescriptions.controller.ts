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
import { getPrescriptionByIdService } from "../services/get-by-id.prescriptions.service";

const logger = createControllerLogger("getPrescriptionById");

export const getPrescriptionByIdController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ prescriptionId: req.params.id },
			"Get prescription by ID request received",
		);

		const result = await getPrescriptionByIdService({
			tenantId: req.user.tenantId,
			prescriptionId: req.params.id as string,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				prescriptionId: result.prescriptionId,
				id: result.id,
			},
			"Prescription retrieved successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
