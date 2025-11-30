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
import { cancelPrescriptionService } from "../services/cancel.prescriptions.service";

const logger = createControllerLogger("cancelPrescription");

export const cancelPrescriptionController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		// Validate staffId is present (required for prescription cancellation)
		if (!req.user.staffId) {
			throw new ForbiddenError(
				"Staff ID required to cancel prescriptions",
				"STAFF_ID_REQUIRED",
			);
		}

		const { reason } = req.body;

		logInput(
			logger,
			{
				prescriptionId: req.params.id,
				reason,
			},
			"Cancel prescription request received",
		);

		const result = await cancelPrescriptionService({
			tenantId: req.user.tenantId,
			prescriptionId: req.params.id as string,
			staffId: req.user.staffId,
			reason,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				prescriptionId: result.prescriptionId,
				id: result.id,
				status: result.status,
			},
			"Prescription cancelled successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);
