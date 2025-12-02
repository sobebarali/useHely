import type { Request, Response } from "express";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { asyncHandler } from "../../../utils/async-handler";
import { updateHospital } from "../services/update.hospital.service";

const logger = createControllerLogger("updateHospital");

export const updateHospitalController = asyncHandler(
	async (req: Request, res: Response) => {
		const startTime = Date.now();
		const { id } = req.params;

		logInput(
			logger,
			{ hospitalId: id, updates: req.body },
			"Update hospital controller started",
		);

		const hospital = await updateHospital({
			id: id as string,
			data: req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				hospitalId: hospital.id,
				updatedFields: Object.keys(req.body),
			},
			"Hospital updated successfully",
			duration,
		);

		res.status(200).json({ success: true, data: hospital });
	},
);
