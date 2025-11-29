import { HospitalStatus } from "@hms/db";
import { BadRequestError, ConflictError, NotFoundError } from "../../../errors";
import {
	deleteVerificationToken,
	getVerificationToken,
	invalidateHospitalCache,
} from "../../../lib/cache/hospital.cache";
import { createServiceLogger, logError } from "../../../lib/logger";
import { findHospitalById } from "../repositories/shared.hospital.repository";
import { updateHospitalVerification } from "../repositories/verify.hospital.repository";
import type { VerifyHospitalOutput } from "../validations/verify.hospital.validation";
import { provisionTenant } from "./provision-tenant.hospital.service";

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
	const hospital = await findHospitalById({ hospitalId: id });

	if (!hospital) {
		logger.warn({ hospitalId: id }, "Hospital not found");
		throw new NotFoundError("Hospital not found");
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
		throw new ConflictError("Hospital is already verified", "ALREADY_VERIFIED");
	}

	// Validate token
	logger.debug({ hospitalId: id }, "Validating verification token");

	// Try to get token from Redis first (faster)
	const cachedToken = await getVerificationToken(id);
	const tokenToValidate = cachedToken || hospital.verificationToken;

	if (tokenToValidate !== token) {
		logger.warn(
			{
				hospitalId: id,
			},
			"Invalid verification token",
		);
		throw new BadRequestError("Invalid verification token", "INVALID_TOKEN");
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
		throw new BadRequestError(
			"Verification token has expired",
			"TOKEN_EXPIRED",
		);
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

		// Invalidate cache and delete verification token from Redis
		await invalidateHospitalCache(id);
		await deleteVerificationToken(id);
		logger.debug(
			{ hospitalId: id },
			"Hospital cache invalidated and verification token removed from Redis",
		);

		// Provision tenant: seed roles, create default department, create admin user
		logger.info({ hospitalId: id }, "Starting tenant provisioning");
		const provisioningResult = await provisionTenant({
			tenantId: id,
			hospitalName: hospital.name,
			adminEmail: hospital.adminEmail,
			adminPhone: hospital.adminPhone,
		});

		logger.info(
			{
				hospitalId: id,
				provisioningResult,
			},
			"Tenant provisioning completed",
		);

		return {
			id: String(updatedHospital._id),
			status: (updatedHospital.status as string) || "VERIFIED",
			message: "Hospital verified and provisioned successfully",
		};
	} catch (error) {
		logError(logger, error, "Failed to verify hospital", {
			hospitalId: id,
		});
		throw error;
	}
}
