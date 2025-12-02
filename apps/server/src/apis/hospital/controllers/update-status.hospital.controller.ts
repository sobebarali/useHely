import type { Request, Response } from "express";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { asyncHandler } from "../../../utils/async-handler";
import { updateStatusHospital } from "../services/update-status.hospital.service";

const logger = createControllerLogger("updateStatusHospital");

export const updateStatusHospitalController = asyncHandler(
	async (req: Request, res: Response) => {
		const startTime = Date.now();
		const { id } = req.params;

		logInput(
			logger,
			{ hospitalId: id, statusUpdate: req.body },
			"Update hospital status controller started",
		);

		const hospital = await updateStatusHospital({
			id: id as string,
			data: req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				hospitalId: hospital.id,
				newStatus: hospital.status,
			},
			"Hospital status updated successfully",
			duration,
		);

		res.status(200).json({ success: true, data: hospital });
	},
);
