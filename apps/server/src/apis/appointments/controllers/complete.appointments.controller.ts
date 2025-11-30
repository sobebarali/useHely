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
import { completeAppointmentService } from "../services/complete.appointments.service";
import type { CompleteAppointmentInput } from "../validations/complete.appointments.validation";

const logger = createControllerLogger("completeAppointment");

export const completeAppointmentController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		if (!req.user.staffId) {
			throw new ForbiddenError(
				"Staff ID required to complete appointments",
				"STAFF_ID_REQUIRED",
			);
		}

		const { id } = req.params as CompleteAppointmentInput["params"];
		const body = req.body as CompleteAppointmentInput["body"];

		logInput(logger, { id, ...body }, "Complete appointment request received");

		const result = await completeAppointmentService({
			tenantId: req.user.tenantId,
			appointmentId: id,
			staffId: req.user.staffId,
			notes: body.notes,
			followUpRequired: body.followUpRequired,
			followUpDate: body.followUpDate,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				appointmentId: result.id,
				status: result.status,
			},
			"Appointment completed successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
