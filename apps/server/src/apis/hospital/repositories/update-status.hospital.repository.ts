import { Hospital } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("updateStatusHospital");

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

export async function updateHospitalStatus({
	id,
	status,
}: {
	id: string;
	status: string;
}) {
	try {
		logger.debug({ hospitalId: id, status }, "Updating hospital status");

		const hospital = await Hospital.findByIdAndUpdate(
			id,
			{ $set: { status } },
			{ new: true, runValidators: true },
		);

		logDatabaseOperation(
			logger,
			"findByIdAndUpdate",
			"hospitals",
			{ _id: id },
			hospital
				? { _id: hospital._id, status: hospital.status, updated: true }
				: { updated: false, reason: "not_found" },
		);

		return hospital;
	} catch (error) {
		logError(logger, error, "Failed to update hospital status", {
			hospitalId: id,
			status,
		});
		throw error;
	}
}
