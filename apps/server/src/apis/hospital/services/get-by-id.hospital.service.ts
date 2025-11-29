import { NotFoundError } from "../../../errors";
import {
	getCachedHospital,
	setCachedHospital,
} from "../../../lib/cache/hospital.cache";
import { createServiceLogger, logError } from "../../../lib/logger";
import { findHospitalById } from "../repositories/get-by-id.hospital.repository";
import type { GetHospitalByIdOutput } from "../validations/get-by-id.hospital.validation";

const logger = createServiceLogger("getHospitalById");

export async function getHospitalById({
	id,
}: {
	id: string;
}): Promise<GetHospitalByIdOutput> {
	logger.info({ hospitalId: id }, "Retrieving hospital by ID");

	try {
		// Try to get from cache first
		const cached = await getCachedHospital(id);
		if (cached) {
			logger.debug({ hospitalId: id }, "Hospital found in cache");
			return cached as GetHospitalByIdOutput;
		}

		logger.debug({ hospitalId: id }, "Hospital not in cache, fetching from DB");
		const hospital = await findHospitalById({ id });

		if (!hospital) {
			logger.warn({ hospitalId: id }, "Hospital not found");
			throw new NotFoundError("Hospital not found");
		}

		logger.info(
			{
				hospitalId: hospital._id,
				status: hospital.status,
			},
			"Hospital retrieved successfully",
		);

		const result: GetHospitalByIdOutput = {
			id: String(hospital._id),
			tenantId: String(hospital._id), // In hospital context, hospital ID serves as tenant ID
			name: hospital.name,
			address: {
				street: hospital.address?.street || "",
				city: hospital.address?.city || "",
				state: hospital.address?.state || "",
				postalCode: hospital.address?.postalCode || "",
				country: hospital.address?.country || "",
			},
			contactEmail: hospital.contactEmail,
			contactPhone: hospital.contactPhone,
			licenseNumber: hospital.licenseNumber,
			status: hospital.status || "PENDING",
			createdAt: hospital.createdAt.toISOString(),
			updatedAt: hospital.updatedAt.toISOString(),
		};

		// Cache the result
		await setCachedHospital(id, result);
		logger.debug({ hospitalId: id }, "Hospital cached successfully");

		return result;
	} catch (error) {
		// Re-throw AppError instances as-is
		if (error instanceof NotFoundError) {
			throw error;
		}

		// Re-throw if it's already a known error with status code (legacy support)
		if (typeof error === "object" && error !== null && "status" in error) {
			throw error;
		}

		// Otherwise, log and throw generic error
		logError(logger, error, "Failed to retrieve hospital by ID", {
			hospitalId: id,
		});
		throw error;
	}
}
