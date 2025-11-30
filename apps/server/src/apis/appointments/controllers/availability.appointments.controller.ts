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
import { getAvailabilityService } from "../services/availability.appointments.service";
import type { GetAvailabilityInput } from "../validations/availability.appointments.validation";

const logger = createControllerLogger("getAvailability");

export const getAvailabilityController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		const { doctorId } = req.params as GetAvailabilityInput["params"];
		const { date } = req.query as unknown as GetAvailabilityInput["query"];

		logInput(logger, { doctorId, date }, "Get availability request received");

		const result = await getAvailabilityService({
			tenantId: req.user.tenantId,
			doctorId,
			date,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				doctorId: result.doctorId,
				date: result.date,
				availableSlots: result.slots.filter((s) => s.available).length,
			},
			"Availability retrieved successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
