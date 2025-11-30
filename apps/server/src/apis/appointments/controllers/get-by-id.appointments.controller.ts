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
import { getAppointmentByIdService } from "../services/get-by-id.appointments.service";
import type { GetAppointmentByIdInput } from "../validations/get-by-id.appointments.validation";

const logger = createControllerLogger("getAppointmentById");

export const getAppointmentByIdController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();
		const { id } = req.params as GetAppointmentByIdInput;

		logInput(logger, { id }, "Get appointment request received");

		const result = await getAppointmentByIdService({
			tenantId: req.user.tenantId,
			appointmentId: id,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				appointmentId: result.id,
				appointmentNumber: result.appointmentNumber,
			},
			"Appointment retrieved successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
