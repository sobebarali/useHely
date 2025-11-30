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
import { transactionsInventoryService } from "../services/transactions.inventory.service";
import type { TransactionsInventoryInput } from "../validations/transactions.inventory.validation";

const logger = createControllerLogger("transactionsInventory");

export const transactionsInventoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "List transactions request received");

		const result = await transactionsInventoryService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as TransactionsInventoryInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				count: result.data.length,
				total: result.pagination.total,
			},
			"Transactions listed successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
