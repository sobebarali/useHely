import { PrescriptionTemplate } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { PrescriptionTemplateLean } from "./shared.prescriptions.repository";

const logger = createRepositoryLogger("getTemplate");

/**
 * Get template by ID
 */
export async function getTemplate({
	tenantId,
	templateId,
}: {
	tenantId: string;
	templateId: string;
}): Promise<PrescriptionTemplateLean | null> {
	try {
		logger.debug({ tenantId, templateId }, "Getting template by ID");

		const template = await PrescriptionTemplate.findOne({
			_id: templateId,
			tenantId,
		}).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"prescriptionTemplate",
			{ tenantId, templateId },
			template ? { _id: template._id, found: true } : { found: false },
		);

		return template as unknown as PrescriptionTemplateLean | null;
	} catch (error) {
		logError(logger, error, "Failed to get template by ID");
		throw error;
	}
}
