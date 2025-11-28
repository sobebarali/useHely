import { Hospital } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { UpdateHospitalInput } from "../validations/update.hospital.validation";

const logger = createRepositoryLogger("updateHospital");

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

export async function updateHospitalById({
	id,
	data,
}: {
	id: string;
	data: UpdateHospitalInput;
}) {
	try {
		logger.debug({ hospitalId: id, data }, "Updating hospital by ID");

		const hospital = await Hospital.findByIdAndUpdate(
			id,
			{ $set: data },
			{ new: true, runValidators: true },
		);

		logDatabaseOperation(
			logger,
			"findByIdAndUpdate",
			"hospitals",
			{ _id: id },
			hospital
				? { _id: hospital._id, updated: true }
				: { updated: false, reason: "not_found" },
		);

		return hospital;
	} catch (error) {
		logError(logger, error, "Failed to update hospital by ID", {
			hospitalId: id,
			data,
		});
		throw error;
	}
}
