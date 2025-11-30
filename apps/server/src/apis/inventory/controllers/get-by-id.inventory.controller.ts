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
import { getByIdInventoryService } from "../services/get-by-id.inventory.service";
import type { GetByIdInventoryParams } from "../validations/get-by-id.inventory.validation";

const logger = createControllerLogger("getByIdInventory");

export const getByIdInventoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.params, "Get inventory by ID request received");

		const result = await getByIdInventoryService({
			tenantId: req.user.tenantId,
			...(req.params as unknown as GetByIdInventoryParams),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ inventoryId: result.id },
			"Inventory item retrieved successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
