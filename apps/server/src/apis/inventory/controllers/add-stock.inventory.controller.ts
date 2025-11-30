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
import { addStockInventoryService } from "../services/add-stock.inventory.service";
import type {
	AddStockInventoryBody,
	AddStockInventoryParams,
} from "../validations/add-stock.inventory.validation";

const logger = createControllerLogger("addStockInventory");

export const addStockInventoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ params: req.params, body: req.body },
			"Add stock request received",
		);

		const result = await addStockInventoryService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			...(req.params as unknown as AddStockInventoryParams),
			...(req.body as AddStockInventoryBody),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				inventoryId: result.id,
				addedQuantity: result.addedQuantity,
				currentStock: result.currentStock,
			},
			"Stock added successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
