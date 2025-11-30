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
import { listTemplatesService } from "../services/list-templates.prescriptions.service";
import type { ListTemplatesInput } from "../validations/list-templates.prescriptions.validation";

const logger = createControllerLogger("listTemplates");

export const listTemplatesController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "List templates request received");

		const result = await listTemplatesService({
			tenantId: req.user.tenantId,
			...(req.query as unknown as ListTemplatesInput),
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				count: result.count,
			},
			"Templates listed successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
