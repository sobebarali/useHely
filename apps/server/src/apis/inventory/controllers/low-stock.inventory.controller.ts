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
import { lowStockInventoryService } from "../services/low-stock.inventory.service";
import type { LowStockInventoryInput } from "../validations/low-stock.inventory.validation";

const logger = createControllerLogger("lowStockInventory");

export const lowStockInventoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "Low stock request received");

		const result = await lowStockInventoryService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as LowStockInventoryInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ count: result.count },
			"Low stock items retrieved successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
