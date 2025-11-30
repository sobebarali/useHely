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
import { updateTemplateService } from "../services/update-template.prescriptions.service";

const logger = createControllerLogger("updateTemplate");

export const updateTemplateController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		// Validate staffId is present (required for template updates)
		if (!req.user.staffId) {
			throw new ForbiddenError(
				"Staff ID required to update templates",
				"STAFF_ID_REQUIRED",
			);
		}

		const { name, category, condition, medicines } = req.body;

		logInput(
			logger,
			{
				templateId: req.params.id,
				name,
				category,
				condition,
				medicines,
			},
			"Update template request received",
		);

		// Check if user is admin (SUPER_ADMIN or HOSPITAL_ADMIN)
		const isAdmin =
			req.user.roles?.includes("SUPER_ADMIN") ||
			req.user.roles?.includes("HOSPITAL_ADMIN");

		const result = await updateTemplateService({
			tenantId: req.user.tenantId,
			templateId: req.params.id as string,
			staffId: req.user.staffId,
			isAdmin: isAdmin || false,
			name,
			category,
			condition,
			medicines,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				templateId: result.id,
				name: result.name,
			},
			"Template updated successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);
