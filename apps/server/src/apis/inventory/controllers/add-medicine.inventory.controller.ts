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
import { addMedicineInventoryService } from "../services/add-medicine.inventory.service";
import type { AddMedicineInventoryBody } from "../validations/add-medicine.inventory.validation";

const logger = createControllerLogger("addMedicineInventory");

export const addMedicineInventoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.body, "Add medicine request received");

		const result = await addMedicineInventoryService({
			tenantId: req.user.tenantId,
			...(req.body as AddMedicineInventoryBody),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ medicineId: result.id, name: result.name },
			"Medicine added successfully",
			duration,
		);

		res.status(201).json(result);
	},
);
