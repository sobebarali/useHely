import { Appointment, AppointmentStatus } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("availabilityAppointments");

// Default time slots (9 AM to 5 PM, 30-minute intervals)
const DEFAULT_SLOTS = [
	{ start: "09:00", end: "09:30" },
	{ start: "09:30", end: "10:00" },
	{ start: "10:00", end: "10:30" },
	{ start: "10:30", end: "11:00" },
	{ start: "11:00", end: "11:30" },
	{ start: "11:30", end: "12:00" },
	{ start: "12:00", end: "12:30" },
	{ start: "14:00", end: "14:30" },
	{ start: "14:30", end: "15:00" },
	{ start: "15:00", end: "15:30" },
	{ start: "15:30", end: "16:00" },
	{ start: "16:00", end: "16:30" },
	{ start: "16:30", end: "17:00" },
];

/**
 * Get booked slots for a doctor on a specific date
 */
export async function getBookedSlots({
	tenantId,
	doctorId,
	date,
}: {
	tenantId: string;
	doctorId: string;
	date: Date;
}) {
	try {
		// Get the date components in local timezone
		const year = date.getFullYear();
		const month = date.getMonth();
		const day = date.getDate();

		// Create start and end of day in local timezone
		const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
		const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

		logger.debug({ tenantId, doctorId, date }, "Getting booked slots");

		const appointments = await Appointment.find({
			tenantId,
			doctorId,
			date: { $gte: startOfDay, $lte: endOfDay },
			status: {
				$nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
			},
		})
			.select("timeSlot")
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"appointment",
			{ tenantId, doctorId, date },
			{ count: appointments.length },
		);

		return appointments.map((apt) => apt.timeSlot);
	} catch (error) {
		logError(logger, error, "Failed to get booked slots", {
			tenantId,
			doctorId,
		});
		throw error;
	}
}

/**
 * Get available slots for a doctor on a specific date
 */
export async function getAvailableSlots({
	tenantId,
	doctorId,
	date,
}: {
	tenantId: string;
	doctorId: string;
	date: Date;
}) {
	try {
		logger.debug({ tenantId, doctorId, date }, "Getting available slots");

		const bookedSlots = await getBookedSlots({ tenantId, doctorId, date });

		// Map slots with availability
		const slots = DEFAULT_SLOTS.map((slot, index) => {
			const isBooked = bookedSlots.some(
				(booked) => booked.start === slot.start && booked.end === slot.end,
			);

			return {
				id: `slot-${index}`,
				startTime: slot.start,
				endTime: slot.end,
				available: !isBooked,
			};
		});

		logDatabaseOperation(
			logger,
			"getAvailableSlots",
			"appointment",
			{ tenantId, doctorId, date },
			{
				totalSlots: slots.length,
				available: slots.filter((s) => s.available).length,
			},
		);

		return slots;
	} catch (error) {
		logError(logger, error, "Failed to get available slots", {
			tenantId,
			doctorId,
		});
		throw error;
	}
}
