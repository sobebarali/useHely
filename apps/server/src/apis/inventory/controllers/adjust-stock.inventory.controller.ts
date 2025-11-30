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
import { adjustStockInventoryService } from "../services/adjust-stock.inventory.service";
import type {
	AdjustStockInventoryBody,
	AdjustStockInventoryParams,
} from "../validations/adjust-stock.inventory.validation";

const logger = createControllerLogger("adjustStockInventory");

export const adjustStockInventoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ params: req.params, body: req.body },
			"Adjust stock request received",
		);

		const result = await adjustStockInventoryService({
			tenantId: req.user.tenantId,
			userId: req.user.id,
			...(req.params as unknown as AdjustStockInventoryParams),
			...(req.body as AdjustStockInventoryBody),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				inventoryId: result.id,
				adjustment: result.adjustment,
				currentStock: result.currentStock,
			},
			"Stock adjusted successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
