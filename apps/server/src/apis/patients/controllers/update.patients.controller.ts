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
import { updatePatientService } from "../services/update.patients.service";
import type { UpdatePatientParams } from "../validations/update.patients.validation";

const logger = createControllerLogger("updatePatient");

export const updatePatientController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();
		const { id } = req.params as UpdatePatientParams;

		// Redact photo from logs
		const logBody = { ...req.body };
		if (logBody.photo) {
			logBody.photo = "[REDACTED]";
		}
		logInput(logger, { id, ...logBody }, "Update patient request received");

		const result = await updatePatientService({
			tenantId: req.user.tenantId,
			patientId: id,
			...req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				patientId: result.patientId,
			},
			"Patient updated successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
