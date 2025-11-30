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
import { expiringInventoryService } from "../services/expiring.inventory.service";
import type { ExpiringInventoryInput } from "../validations/expiring.inventory.validation";

const logger = createControllerLogger("expiringInventory");

export const expiringInventoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "Expiring items request received");

		const result = await expiringInventoryService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as ExpiringInventoryInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ count: result.count },
			"Expiring items retrieved successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
