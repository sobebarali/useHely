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
import { updateAppointmentService } from "../services/update.appointments.service";

const logger = createControllerLogger("updateAppointment");

export const updateAppointmentController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ id: req.params.id, ...req.body },
			"Update appointment request received",
		);

		const result = await updateAppointmentService({
			tenantId: req.user.tenantId,
			appointmentId: req.params.id,
			...req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				appointmentId: result.id,
				appointmentNumber: result.appointmentNumber,
			},
			"Appointment updated successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
