import { Department, Patient, Staff } from "@hms/db";
import { NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { getAppointmentById } from "../repositories/get-by-id.appointments.repository";
import type { GetAppointmentByIdOutput } from "../validations/get-by-id.appointments.validation";

const logger = createServiceLogger("getAppointmentById");

/**
 * Get appointment by ID with full details
 */
export async function getAppointmentByIdService({
	tenantId,
	appointmentId,
}: {
	tenantId: string;
	appointmentId: string;
}): Promise<GetAppointmentByIdOutput> {
	logger.info({ tenantId, appointmentId }, "Getting appointment by ID");

	const appointment = await getAppointmentById({ tenantId, appointmentId });

	if (!appointment) {
		throw new NotFoundError("Appointment not found", "NOT_FOUND");
	}

	// Fetch related entities
	const [patient, doctor, department, cancelledByStaff] = await Promise.all([
		Patient.findOne({ _id: appointment.patientId, tenantId }).lean(),
		Staff.findOne({ _id: appointment.doctorId, tenantId }).lean(),
		Department.findOne({ _id: appointment.departmentId, tenantId }).lean(),
		appointment.cancelledBy
			? Staff.findOne({ _id: appointment.cancelledBy, tenantId }).lean()
			: null,
	]);

	logger.info({ appointmentId }, "Appointment retrieved successfully");

	return {
		id: String(appointment._id),
		appointmentNumber: appointment.appointmentNumber,
		patient: {
			id: appointment.patientId,
			patientId: patient?.patientId || "",
			firstName: patient?.firstName || "",
			lastName: patient?.lastName || "",
			phone: patient?.phone || "",
			email: patient?.email ?? undefined,
			dateOfBirth: patient?.dateOfBirth?.toISOString() || "",
			gender: patient?.gender || "",
		},
		doctor: {
			id: appointment.doctorId,
			employeeId: doctor?.employeeId || "",
			firstName: doctor?.firstName || "",
			lastName: doctor?.lastName || "",
			specialization: doctor?.specialization ?? undefined,
			departmentId: doctor?.departmentId || "",
		},
		department: {
			id: appointment.departmentId,
			name: department?.name || "",
			code: department?.code || "",
		},
		date: appointment.date.toISOString(),
		timeSlot: appointment.timeSlot,
		type: appointment.type,
		reason: appointment.reason ?? undefined,
		notes: appointment.notes ?? undefined,
		priority: appointment.priority,
		status: appointment.status,
		queueNumber: appointment.queueNumber ?? undefined,
		checkedInAt: appointment.checkedInAt?.toISOString(),
		completedAt: appointment.completedAt?.toISOString(),
		cancelledAt: appointment.cancelledAt?.toISOString(),
		cancelledBy: cancelledByStaff
			? {
					id: String(cancelledByStaff._id),
					firstName: cancelledByStaff.firstName,
					lastName: cancelledByStaff.lastName,
				}
			: undefined,
		cancellationReason: appointment.cancellationReason ?? undefined,
		createdAt: appointment.createdAt.toISOString(),
		updatedAt: appointment.updatedAt.toISOString(),
	};
}
