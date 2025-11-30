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
import { cancelAppointmentService } from "../services/cancel.appointments.service";
import type { CancelAppointmentInput } from "../validations/cancel.appointments.validation";

const logger = createControllerLogger("cancelAppointment");

export const cancelAppointmentController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		if (!req.user.staffId) {
			throw new ForbiddenError(
				"Staff ID required to cancel appointments",
				"STAFF_ID_REQUIRED",
			);
		}

		const { params, body } = req as unknown as {
			params: CancelAppointmentInput["params"];
			body: CancelAppointmentInput["body"];
		};

		logInput(
			logger,
			{ id: params.id, reason: body.reason },
			"Cancel appointment request received",
		);

		const result = await cancelAppointmentService({
			tenantId: req.user.tenantId,
			appointmentId: params.id,
			staffId: req.user.staffId,
			reason: body.reason,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				appointmentId: result.id,
				status: result.status,
			},
			"Appointment cancelled successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
