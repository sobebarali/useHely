import type { Request, Response } from "express";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { asyncHandler } from "../../../utils/async-handler";
import { registerHospital } from "../services/register.hospital.service";

const logger = createControllerLogger("registerHospital");

export const registerHospitalController = asyncHandler(
	async (req: Request, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.body, "Register hospital controller started");

		const hospital = await registerHospital(req.body);

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				hospitalId: hospital.id,
				tenantId: hospital.tenantId,
				status: hospital.status,
			},
			"Hospital registered successfully",
			duration,
		);

		res.status(201).json(hospital);
	},
);
