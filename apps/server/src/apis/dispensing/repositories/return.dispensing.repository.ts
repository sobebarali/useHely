import { Dispensing, DispensingStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("returnDispensing");

/**
 * Delete dispensing record to return prescription to queue
 */
export async function deleteDispensing({
	tenantId,
	prescriptionId,
}: {
	tenantId: string;
	prescriptionId: string;
}): Promise<boolean> {
	try {
		logger.debug(
			{ tenantId, prescriptionId },
			"Deleting dispensing record to return to queue",
		);

		const result = await Dispensing.deleteOne({
			tenantId,
			prescriptionId,
			status: DispensingStatus.DISPENSING,
		});

		logDatabaseOperation(
			logger,
			"deleteOne",
			"dispensing",
			{ tenantId, prescriptionId },
			{ deleted: result.deletedCount > 0 },
		);

		return result.deletedCount > 0;
	} catch (error) {
		logError(logger, error, "Failed to delete dispensing record");
		throw error;
	}
}
