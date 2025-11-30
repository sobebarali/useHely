import type { Response } from "express";
import { ForbiddenError } from "../../../errors";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "../../../utils/async-handler";
import { createPrescriptionService } from "../services/create.prescriptions.service";

const logger = createControllerLogger("createPrescription");

export const createPrescriptionController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		// Validate staffId is present (required for prescriptions)
		if (!req.user.staffId) {
			throw new ForbiddenError(
				"Staff ID required to create prescriptions",
				"STAFF_ID_REQUIRED",
			);
		}

		logInput(logger, req.body, "Create prescription request received");

		const result = await createPrescriptionService({
			tenantId: req.user.tenantId,
			doctorId: req.user.staffId,
			...req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				prescriptionId: result.prescriptionId,
				id: result.id,
			},
			"Prescription created successfully",
			duration,
		);

		res.status(201).json(result);
	},
);
