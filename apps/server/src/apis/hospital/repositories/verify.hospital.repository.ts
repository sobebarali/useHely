import { Hospital, HospitalStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("verifyHospital");

export async function updateHospitalVerification({ id }: { id: string }) {
	try {
		logger.debug({ hospitalId: id }, "Updating hospital verification status");

		const hospital = await Hospital.findByIdAndUpdate(
			id,
			{
				status: HospitalStatus.VERIFIED,
				$unset: {
					verificationToken: "",
					verificationExpires: "",
				},
			},
			{ new: true },
		);

		logDatabaseOperation(
			logger,
			"update",
			"hospitals",
			{ _id: id },
			hospital
				? { _id: hospital._id, status: hospital.status }
				: { found: false },
		);

		return hospital;
	} catch (error) {
		logError(logger, error, "Failed to update hospital verification", {
			hospitalId: id,
		});
		throw error;
	}
}
