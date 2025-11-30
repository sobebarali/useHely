import type { Response } from "express";
import { ForbiddenError } from "../../../errors";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "../../../utils/async-handler";
import { createTemplateService } from "../services/create-template.prescriptions.service";

const logger = createControllerLogger("createTemplate");

export const createTemplateController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		// Validate staffId is present (required for template creation)
		if (!req.user.staffId) {
			throw new ForbiddenError(
				"Staff ID required to create templates",
				"STAFF_ID_REQUIRED",
			);
		}

		logInput(logger, req.body, "Create template request received");

		const result = await createTemplateService({
			tenantId: req.user.tenantId,
			createdBy: req.user.staffId,
			...req.body,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				templateId: result.id,
				name: result.name,
			},
			"Template created successfully",
			duration,
		);

		res.status(201).json(result);
	},
);
