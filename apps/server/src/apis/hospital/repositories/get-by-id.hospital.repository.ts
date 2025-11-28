import { Hospital } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("getHospitalById");

export async function findHospitalById({ id }: { id: string }) {
	try {
		logger.debug({ hospitalId: id }, "Querying hospital by ID");

		const hospital = await Hospital.findById(id);

		logDatabaseOperation(
			logger,
			"findById",
			"hospitals",
			{ _id: id },
			hospital ? { _id: hospital._id, found: true } : { found: false },
		);

		return hospital;
	} catch (error) {
		logError(logger, error, "Failed to query hospital by ID", {
			hospitalId: id,
		});
		throw error;
	}
}
