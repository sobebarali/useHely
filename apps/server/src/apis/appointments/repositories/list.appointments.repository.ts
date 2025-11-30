import { Appointment } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { ListAppointmentsInput } from "../validations/list.appointments.validation";

const logger = createRepositoryLogger("listAppointments");

/**
 * List appointments with filters and pagination
 */
export async function listAppointments({
	tenantId,
	page,
	limit,
	patientId,
	doctorId,
	departmentId,
	date,
	startDate,
	endDate,
	status,
	type,
	sortBy,
	sortOrder,
}: {
	tenantId: string;
} & ListAppointmentsInput) {
	try {
		logger.debug(
			{ tenantId, page, limit, patientId, doctorId, status },
			"Listing appointments",
		);

		const query: Record<string, unknown> = { tenantId };

		// Apply filters
		if (patientId) {
			query.patientId = patientId;
		}
		if (doctorId) {
			query.doctorId = doctorId;
		}
		if (departmentId) {
			query.departmentId = departmentId;
		}
		if (status) {
			query.status = status;
		}
		if (type) {
			query.type = type;
		}

		// Date filters
		if (date) {
			const targetDate = new Date(date);
			const startOfDay = new Date(targetDate);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(targetDate);
			endOfDay.setHours(23, 59, 59, 999);
			query.date = { $gte: startOfDay, $lte: endOfDay };
		} else if (startDate || endDate) {
			query.date = {};
			if (startDate) {
				(query.date as Record<string, Date>).$gte = new Date(startDate);
			}
			if (endDate) {
				(query.date as Record<string, Date>).$lte = new Date(endDate);
			}
		}

		// Count total
		const total = await Appointment.countDocuments(query);

		// Calculate pagination
		const skip = (page - 1) * limit;
		const sortDirection = sortOrder === "asc" ? 1 : -1;

		// Fetch appointments
		const appointments = await Appointment.find(query)
			.sort({ [sortBy]: sortDirection })
			.skip(skip)
			.limit(limit)
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"appointment",
			{ tenantId, page, limit },
			{ count: appointments.length, total },
		);

		return {
			data: appointments,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	} catch (error) {
		logError(logger, error, "Failed to list appointments", { tenantId });
		throw error;
	}
}
