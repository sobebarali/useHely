import { PrescriptionTemplate } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("deleteTemplate");

/**
 * Delete a prescription template
 */
export async function deleteTemplate({
	tenantId,
	templateId,
}: {
	tenantId: string;
	templateId: string;
}): Promise<boolean> {
	try {
		logger.debug({ tenantId, templateId }, "Deleting template");

		const result = await PrescriptionTemplate.deleteOne({
			_id: templateId,
			tenantId,
		});

		const deleted = result.deletedCount > 0;

		logDatabaseOperation(
			logger,
			"deleteOne",
			"prescriptionTemplate",
			{ tenantId, templateId },
			{ deleted, deletedCount: result.deletedCount },
		);

		return deleted;
	} catch (error) {
		logError(logger, error, "Failed to delete template");
		throw error;
	}
}
