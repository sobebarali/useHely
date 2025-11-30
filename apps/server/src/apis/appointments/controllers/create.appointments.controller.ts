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
import { createAppointmentService } from "../services/create.appointments.service";

const logger = createControllerLogger("createAppointment");

export const createAppointmentController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.body, "Create appointment request received");

		const result = await createAppointmentService({
			tenantId: req.user.tenantId,
			staffId: req.user.staffId,
			...req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				appointmentId: result.id,
				appointmentNumber: result.appointmentNumber,
			},
			"Appointment created successfully",
			duration,
		);

		res.status(201).json(result);
	},
);
