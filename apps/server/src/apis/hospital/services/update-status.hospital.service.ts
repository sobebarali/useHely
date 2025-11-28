import { createServiceLogger } from "../../../lib/logger";
import {
	findHospitalById,
	updateHospitalStatus as updateHospitalStatusRepo,
} from "../repositories/update-status.hospital.repository";
import type {
	UpdateStatusInput,
	UpdateStatusOutput,
} from "../validations/update-status.hospital.validation";

const logger = createServiceLogger("updateStatusHospital");

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
	PENDING: ["VERIFIED"],
	VERIFIED: ["ACTIVE"],
	ACTIVE: ["SUSPENDED", "INACTIVE"],
	SUSPENDED: ["ACTIVE", "INACTIVE"],
	INACTIVE: [], // Cannot transition from INACTIVE
};

export async function updateStatusHospital({
	id,
	data,
}: {
	id: string;
	data: UpdateStatusInput;
}): Promise<UpdateStatusOutput> {
	logger.info(
		{
			hospitalId: id,
			newStatus: data.status,
			reason: data.reason,
		},
		"Starting hospital status update",
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

	const currentStatus = existingHospital.status;

	logger.debug(
		{
			hospitalId: id,
			currentStatus,
			requestedStatus: data.status,
		},
		"Validating status transition",
	);

	// Validate status transition
	const allowedTransitions = VALID_TRANSITIONS[currentStatus];
	if (!allowedTransitions || !allowedTransitions.includes(data.status)) {
		logger.warn(
			{
				hospitalId: id,
				currentStatus,
				requestedStatus: data.status,
				allowedTransitions,
			},
			"Invalid status transition",
		);
		throw {
			status: 400,
			code: "INVALID_TRANSITION",
			message: `Cannot transition from ${currentStatus} to ${data.status}`,
		};
	}

	logger.debug({ hospitalId: id }, "Status transition is valid, proceeding");

	// Update hospital status
	const updatedHospital = await updateHospitalStatusRepo({
		id,
		status: data.status,
	});

	if (!updatedHospital) {
		logger.error({ hospitalId: id }, "Failed to update hospital status");
		throw {
			status: 500,
			code: "UPDATE_FAILED",
			message: "Failed to update hospital status",
		};
	}

	logger.info(
		{
			hospitalId: id,
			oldStatus: currentStatus,
			newStatus: updatedHospital.status,
		},
		"Hospital status updated successfully",
	);

	return {
		id: String(updatedHospital._id),
		status: updatedHospital.status,
		updatedAt: updatedHospital.updatedAt.toISOString(),
	};
}
