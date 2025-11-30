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
import { deleteTemplateService } from "../services/delete-template.prescriptions.service";

const logger = createControllerLogger("deleteTemplate");

export const deleteTemplateController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		// Validate staffId is present (required for template deletion)
		if (!req.user.staffId) {
			throw new ForbiddenError(
				"Staff ID required to delete templates",
				"STAFF_ID_REQUIRED",
			);
		}

		logInput(
			logger,
			{
				templateId: req.params.id,
			},
			"Delete template request received",
		);

		// Check if user is admin (SUPER_ADMIN or HOSPITAL_ADMIN)
		const isAdmin =
			req.user.roles?.includes("SUPER_ADMIN") ||
			req.user.roles?.includes("HOSPITAL_ADMIN");

		const result = await deleteTemplateService({
			tenantId: req.user.tenantId,
			templateId: req.params.id as string,
			staffId: req.user.staffId,
			isAdmin: isAdmin || false,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				templateId: req.params.id,
			},
			"Template deleted successfully",
			duration,
		);

		res.status(200).json({
			success: true,
			data: result,
		});
	},
);
