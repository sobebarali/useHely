import { createServiceLogger, logError } from "../../../lib/logger";
import type { GetHospitalByIdOutput } from "../dtos/get-by-id.hospital.dto";
import { findHospitalById } from "../repositories/get-by-id.hospital.repository";

const logger = createServiceLogger("getHospitalById");

export async function getHospitalById({
	id,
}: {
	id: string;
}): Promise<GetHospitalByIdOutput> {
	logger.info({ hospitalId: id }, "Retrieving hospital by ID");

	try {
		const hospital = await findHospitalById({ id });

		if (!hospital) {
			logger.warn({ hospitalId: id }, "Hospital not found");
			throw {
				status: 404,
				code: "NOT_FOUND",
				message: "Hospital not found",
			};
		}

		logger.info(
			{
				hospitalId: hospital._id,
				status: hospital.status,
			},
			"Hospital retrieved successfully",
		);

		return {
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
	} catch (error) {
		// Re-throw if it's already a known error with status code
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
