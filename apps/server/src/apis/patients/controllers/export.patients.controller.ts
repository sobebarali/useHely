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
import { exportPatientsService } from "../services/export.patients.service";
import type { ExportPatientsInput } from "../validations/export.patients.validation";

const logger = createControllerLogger("exportPatients");

export const exportPatientsController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "Export patients request received");

		const query = req.query as unknown as ExportPatientsInput;

		const result = await exportPatientsService({
			tenantId: req.user.tenantId,
			...query,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{
				format: query.format,
				filename: result.filename,
			},
			"Patients exported successfully",
			duration,
		);

		// Set headers for file download
		res.setHeader("Content-Type", result.contentType);
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${result.filename}"`,
		);

		res.status(200).send(result.content);
	},
);
