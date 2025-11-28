import { createServiceLogger } from "../../../lib/logger";
import {
	findHospitalById,
	updateHospitalById,
} from "../repositories/update.hospital.repository";
import type {
	UpdateHospitalInput,
	UpdateHospitalOutput,
} from "../validations/update.hospital.validation";

const logger = createServiceLogger("updateHospital");

export async function updateHospital({
	id,
	data,
}: {
	id: string;
	data: UpdateHospitalInput;
}): Promise<UpdateHospitalOutput> {
	logger.info(
		{
			hospitalId: id,
			fieldsToUpdate: Object.keys(data),
		},
		"Starting hospital update",
	);

	// Check if hospital exists
	logger.debug({ hospitalId: id }, "Checking if hospital exists");
	const existingHospital = await findHospitalById({ id });

	if (!existingHospital) {
		logger.warn({ hospitalId: id }, "Hospital not found");
		throw {
			status: 404,
			code: "NOT_FOUND",
			message: "Hospital not found",
		};
	}

	logger.debug({ hospitalId: id }, "Hospital found, proceeding with update");

	// Update hospital
	const updatedHospital = await updateHospitalById({ id, data });

	if (!updatedHospital) {
		logger.error({ hospitalId: id }, "Failed to update hospital");
		throw {
			status: 500,
			code: "UPDATE_FAILED",
			message: "Failed to update hospital",
		};
	}

	logger.info(
		{
			hospitalId: id,
			updatedFields: Object.keys(data),
		},
		"Hospital updated successfully",
	);

	return {
		id: String(updatedHospital._id),
		name: updatedHospital.name,
		address: {
			street: updatedHospital.address?.street || "",
			city: updatedHospital.address?.city || "",
			state: updatedHospital.address?.state || "",
			postalCode: updatedHospital.address?.postalCode || "",
			country: updatedHospital.address?.country || "",
		},
		contactEmail: updatedHospital.contactEmail,
		contactPhone: updatedHospital.contactPhone,
		status: updatedHospital.status || "PENDING",
		updatedAt: updatedHospital.updatedAt.toISOString(),
	};
}
