import type { Request, Response } from "express";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { asyncHandler } from "../../../utils/async-handler";
import { verifyHospital } from "../services/verify.hospital.service";

const logger = createControllerLogger("verifyHospital");

export const verifyHospitalController = asyncHandler(
	async (req: Request, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ hospitalId: req.params.id },
			"Verify hospital controller started",
		);

		const result = await verifyHospital({
			id: req.params.id as string,
			token: req.body.token as string,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				hospitalId: result.id,
				status: result.status,
			},
			"Hospital verified successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
