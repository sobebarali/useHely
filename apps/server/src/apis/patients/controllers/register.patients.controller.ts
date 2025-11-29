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
import { registerPatientService } from "../services/register.patients.service";

const logger = createControllerLogger("registerPatient");

export const registerPatientController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		// Redact photo from logs
		const logBody = { ...req.body };
		if (logBody.photo) {
			logBody.photo = "[REDACTED]";
		}
		logInput(logger, logBody, "Register patient request received");

		const result = await registerPatientService({
			tenantId: req.user.tenantId,
			...req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				patientId: result.patientId,
				id: result.id,
			},
			"Patient registered successfully",
			duration,
		);

		res.status(201).json(result);
	},
);
