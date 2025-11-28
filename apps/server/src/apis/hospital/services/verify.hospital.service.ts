import { HospitalStatus } from "@hms/db";
import { createServiceLogger, logError } from "../../../lib/logger";
import {
	findHospitalById,
	updateHospitalVerification,
} from "../repositories/verify.hospital.repository";
import type { VerifyHospitalOutput } from "../validations/verify.hospital.validation";

const logger = createServiceLogger("verifyHospital");

export async function verifyHospital({
	id,
	token,
}: {
	id: string;
	token: string;
}): Promise<VerifyHospitalOutput> {
	logger.info(
		{
			hospitalId: id,
		},
		"Starting hospital verification",
	);

	// Find hospital by ID
	logger.debug({ hospitalId: id }, "Fetching hospital details");
	const hospital = await findHospitalById({ id });

	if (!hospital) {
		logger.warn({ hospitalId: id }, "Hospital not found");
		throw {
			status: 404,
			code: "NOT_FOUND",
			message: "Hospital not found",
		};
	}

	logger.debug(
		{
			hospitalId: id,
			currentStatus: hospital.status,
		},
		"Hospital found, checking status",
	);

	// Check if already verified
	if (hospital.status !== HospitalStatus.PENDING) {
		logger.warn(
			{
				hospitalId: id,
				currentStatus: hospital.status,
			},
			"Hospital already verified",
		);
		throw {
			status: 409,
			code: "ALREADY_VERIFIED",
			message: "Hospital is already verified",
		};
	}

	// Validate token
	logger.debug({ hospitalId: id }, "Validating verification token");
	if (hospital.verificationToken !== token) {
		logger.warn(
			{
				hospitalId: id,
			},
			"Invalid verification token",
		);
		throw {
			status: 400,
			code: "INVALID_TOKEN",
			message: "Invalid verification token",
		};
	}

	// Check if token expired
	if (
		!hospital.verificationExpires ||
		hospital.verificationExpires < new Date()
	) {
		logger.warn(
			{
				hospitalId: id,
				expiresAt: hospital.verificationExpires,
			},
			"Verification token expired",
		);
		throw {
			status: 400,
			code: "TOKEN_EXPIRED",
			message: "Verification token has expired",
		};
	}

	logger.debug({ hospitalId: id }, "Token is valid, updating hospital status");

	try {
		// Update hospital status
		const updatedHospital = await updateHospitalVerification({ id });

		if (!updatedHospital) {
			logger.error(
				{ hospitalId: id },
				"Failed to update hospital verification status",
			);
			throw new Error("Failed to update hospital verification status");
		}

		logger.info(
			{
				hospitalId: id,
				newStatus: updatedHospital.status,
			},
			"Hospital verified successfully",
		);

		return {
			id: String(updatedHospital._id),
			status: (updatedHospital.status as string) || "VERIFIED",
			message: "Hospital verified successfully",
		};
	} catch (error) {
		logError(logger, error, "Failed to verify hospital", {
			hospitalId: id,
		});
		throw error;
	}
}
