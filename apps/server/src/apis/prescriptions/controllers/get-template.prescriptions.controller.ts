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
import { getTemplateService } from "../services/get-template.prescriptions.service";

const logger = createControllerLogger("getTemplate");

export const getTemplateController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(
			logger,
			{ templateId: req.params.id },
			"Get template by ID request received",
		);

		const result = await getTemplateService({
			tenantId: req.user.tenantId,
			templateId: req.params.id as string,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				templateId: result.id,
				name: result.name,
			},
			"Template retrieved successfully",
			duration,
		);

		res.status(200).json(result);
	},
);
