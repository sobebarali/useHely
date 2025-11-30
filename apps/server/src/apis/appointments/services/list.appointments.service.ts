import { createServiceLogger } from "../../../lib/logger";
import { findPatientsByIds } from "../../patients/repositories/shared.patients.repository";
import {
	findDepartmentsByIds,
	findStaffByIds,
} from "../../users/repositories/shared.users.repository";
import { listAppointments } from "../repositories/list.appointments.repository";
import type {
	ListAppointmentsInput,
	ListAppointmentsOutput,
} from "../validations/list.appointments.validation";

const logger = createServiceLogger("listAppointments");

/**
 * List appointments with filters and pagination
 */
export async function listAppointmentsService({
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
} & ListAppointmentsInput): Promise<ListAppointmentsOutput> {
	logger.info({ tenantId, page, limit, status, type }, "Listing appointments");

	const result = await listAppointments({
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
	});

	// Fetch related entities for enrichment
	const patientIds = [...new Set(result.data.map((apt) => apt.patientId))];
	const doctorIds = [...new Set(result.data.map((apt) => apt.doctorId))];
	const departmentIds = [
		...new Set(result.data.map((apt) => apt.departmentId)),
	];

	const [patients, doctors, departments] = await Promise.all([
		findPatientsByIds({ tenantId, patientIds }),
		findStaffByIds({ tenantId, staffIds: doctorIds }),
		findDepartmentsByIds({ tenantId, departmentIds }),
	]);

	// Create lookup maps
	const patientMap = new Map(patients.map((p) => [String(p._id), p]));
	const doctorMap = new Map(doctors.map((d) => [String(d._id), d]));
	const departmentMap = new Map(departments.map((d) => [String(d._id), d]));

	// Enrich appointments with related data
	const enrichedData = result.data.map((apt) => {
		const patient = patientMap.get(apt.patientId);
		const doctor = doctorMap.get(apt.doctorId);
		const department = departmentMap.get(apt.departmentId);

		return {
			id: String(apt._id),
			appointmentNumber: apt.appointmentNumber,
			patient: {
				id: apt.patientId,
				patientId: patient?.patientId || "",
				firstName: patient?.firstName || "",
				lastName: patient?.lastName || "",
			},
			doctor: {
				id: apt.doctorId,
				employeeId: doctor?.employeeId || "",
				firstName: doctor?.firstName || "",
				lastName: doctor?.lastName || "",
				specialization: doctor?.specialization ?? undefined,
			},
			department: {
				id: apt.departmentId,
				name: department?.name || "",
				code: department?.code || "",
			},
			date: apt.date.toISOString(),
			timeSlot: apt.timeSlot,
			type: apt.type,
			status: apt.status,
			priority: apt.priority,
			queueNumber: apt.queueNumber ?? undefined,
			createdAt: apt.createdAt.toISOString(),
		};
	});

	logger.info(
		{ count: enrichedData.length, total: result.pagination.total },
		"Appointments listed successfully",
	);

	return {
		data: enrichedData,
		pagination: result.pagination,
	};
}
