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
import { listMedicinesInventoryService } from "../services/list-medicines.inventory.service";
import type { ListMedicinesInventoryInput } from "../validations/list-medicines.inventory.validation";

const logger = createControllerLogger("listMedicinesInventory");

export const listMedicinesInventoryController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "List medicines request received");

		const result = await listMedicinesInventoryService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as ListMedicinesInventoryInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				count: result.data.length,
				total: result.pagination.total,
			},
			"Medicines listed successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
