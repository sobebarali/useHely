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
import { listInventoryService } from "../services/list.inventory.service";
import type { ListInventoryInput } from "../validations/list.inventory.validation";

const logger = createControllerLogger("listInventory");

export const listInventoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "List inventory request received");

		const result = await listInventoryService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as ListInventoryInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				count: result.data.length,
				total: result.pagination.total,
			},
			"Inventory listed successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
