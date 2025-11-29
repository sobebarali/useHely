import { NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { getPatientById } from "../repositories/get-by-id.patients.repository";
import {
	findDepartmentById,
	findStaffById,
} from "../repositories/shared.patients.repository";
import type { GetPatientOutput } from "../validations/get-by-id.patients.validation";

const logger = createServiceLogger("getPatientById");

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date): number {
	const today = new Date();
	let age = today.getFullYear() - dateOfBirth.getFullYear();
	const monthDiff = today.getMonth() - dateOfBirth.getMonth();
	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
	) {
		age--;
	}
	return age;
}

/**
 * Get patient by ID within the hospital tenant
 */
export async function getPatientByIdService({
	tenantId,
	patientId,
}: {
	tenantId: string;
	patientId: string;
}): Promise<GetPatientOutput> {
	logger.info({ tenantId, patientId }, "Getting patient by ID");

	const patient = await getPatientById({ tenantId, patientId });

	if (!patient) {
		logger.warn({ tenantId, patientId }, "Patient not found");
		throw new NotFoundError("Patient not found", "NOT_FOUND");
	}

	// Fetch related data
	const department = patient.departmentId
		? await findDepartmentById({ departmentId: patient.departmentId })
		: null;

	const assignedDoctor = patient.assignedDoctorId
		? await findStaffById({ staffId: patient.assignedDoctorId })
		: null;

	// Calculate age (business logic)
	const age = calculateAge(new Date(patient.dateOfBirth));

	logger.info({ patientId, tenantId }, "Patient retrieved successfully");

	return {
		id: String(patient._id),
		patientId: patient.patientId,
		firstName: patient.firstName,
		lastName: patient.lastName,
		dateOfBirth: patient.dateOfBirth
			? patient.dateOfBirth.toISOString()
			: new Date().toISOString(),
		age,
		gender: patient.gender,
		bloodGroup: patient.bloodGroup || undefined,
		phone: patient.phone,
		email: patient.email || undefined,
		address: {
			street: patient.address?.street || "",
			city: patient.address?.city || "",
			state: patient.address?.state || "",
			postalCode: patient.address?.postalCode || "",
			country: patient.address?.country || "",
		},
		emergencyContact: {
			name: patient.emergencyContact?.name || "",
			relationship: patient.emergencyContact?.relationship || "",
			phone: patient.emergencyContact?.phone || "",
		},
		patientType: patient.patientType,
		department: department?.name || undefined,
		assignedDoctor: assignedDoctor
			? {
					id: String(assignedDoctor._id),
					firstName: assignedDoctor.firstName || "",
					lastName: assignedDoctor.lastName || "",
					specialization: assignedDoctor.specialization || undefined,
				}
			: undefined,
		photoUrl: patient.photoUrl || undefined,
		status: patient.status || "ACTIVE",
		createdAt: patient.createdAt?.toISOString() || new Date().toISOString(),
		updatedAt: patient.updatedAt?.toISOString() || new Date().toISOString(),
	};
}
