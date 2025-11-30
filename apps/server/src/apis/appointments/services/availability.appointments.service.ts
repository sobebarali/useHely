import { Staff } from "@hms/db";
import { BadRequestError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { getAvailableSlots } from "../repositories/availability.appointments.repository";
import type { GetAvailabilityOutput } from "../validations/availability.appointments.validation";

const logger = createServiceLogger("availabilityAppointments");

/**
 * Get doctor availability for a specific date
 */
export async function getAvailabilityService({
	tenantId,
	doctorId,
	date,
}: {
	tenantId: string;
	doctorId: string;
	date: string;
}): Promise<GetAvailabilityOutput> {
	logger.info({ tenantId, doctorId, date }, "Getting doctor availability");

	// Validate doctor exists
	const doctor = await Staff.findOne({ _id: doctorId, tenantId }).lean();
	if (!doctor) {
		throw new NotFoundError("Doctor not found", "DOCTOR_NOT_FOUND");
	}

	// Validate date is not in the past
	const targetDate = new Date(date);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (targetDate < today) {
		throw new BadRequestError(
			"Cannot check availability for past dates",
			"INVALID_DATE",
		);
	}

	// Get available slots
	const slots = await getAvailableSlots({
		tenantId,
		doctorId,
		date: targetDate,
	});

	logger.info(
		{ doctorId, date, availableSlots: slots.filter((s) => s.available).length },
		"Availability retrieved successfully",
	);

	return {
		doctorId,
		date: targetDate.toISOString().split("T")[0] as string,
		slots,
	};
}
