import type { Request, Response } from "express";
import { createControllerLogger, logSuccess } from "../../../lib/logger";
import { asyncHandler } from "../../../utils/async-handler";
import { getHospitalById } from "../services/get-by-id.hospital.service";

const logger = createControllerLogger("getHospitalById");

export const getHospitalByIdController = asyncHandler(
	async (req: Request, res: Response) => {
		const startTime = Date.now();
		const { id } = req.params;

		logger.info({ hospitalId: id }, "Get hospital by ID controller started");

		const hospital = await getHospitalById({ id: id as string });

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				hospitalId: hospital.id,
				status: hospital.status,
			},
			"Hospital retrieved successfully",
			duration,
		);

		res.status(200).json(hospital);
	},
);
