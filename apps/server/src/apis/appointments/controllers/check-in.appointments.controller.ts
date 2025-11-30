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
import { checkInAppointmentService } from "../services/check-in.appointments.service";
import type { CheckInAppointmentInput } from "../validations/check-in.appointments.validation";

const logger = createControllerLogger("checkInAppointment");

export const checkInAppointmentController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		const { id } = req.params as CheckInAppointmentInput;

		logInput(logger, { id }, "Check-in appointment request received");

		const result = await checkInAppointmentService({
			tenantId: req.user.tenantId,
			appointmentId: id,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				appointmentId: result.id,
				status: result.status,
				queueNumber: result.queueNumber,
			},
			"Appointment checked-in successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
