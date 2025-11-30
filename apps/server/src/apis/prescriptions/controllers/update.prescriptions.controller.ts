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
import { updatePrescriptionService } from "../services/update.prescriptions.service";

const logger = createControllerLogger("updatePrescription");

export const updatePrescriptionController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		// Validate staffId is present (required for prescription updates)
		if (!req.user.staffId) {
			throw new ForbiddenError(
				"Staff ID required to update prescriptions",
				"STAFF_ID_REQUIRED",
			);
		}

		const { diagnosis, notes, medicines, followUpDate } = req.body;

		logInput(
			logger,
			{
				prescriptionId: req.params.id,
				diagnosis,
				notes,
				medicines,
				followUpDate,
			},
			"Update prescription request received",
		);

		const result = await updatePrescriptionService({
			tenantId: req.user.tenantId,
			prescriptionId: req.params.id as string,
			doctorId: req.user.staffId,
			diagnosis,
			notes,
			medicines,
			followUpDate,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				prescriptionId: result.prescriptionId,
				id: result.id,
			},
			"Prescription updated successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
