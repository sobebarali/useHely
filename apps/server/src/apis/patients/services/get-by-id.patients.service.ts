import { NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { getPatientById } from "../repositories/get-by-id.patients.repository";

const logger = createServiceLogger("getPatientById");

/**
 * Get patient by ID within the hospital tenant
 */
export async function getPatientByIdService({
	tenantId,
	patientId,
}: {
	tenantId: string;
	patientId: string;
}) {
	logger.info({ tenantId, patientId }, "Getting patient by ID");

	const result = await getPatientById({ tenantId, patientId });

	if (!result) {
		logger.warn({ tenantId, patientId }, "Patient not found");
		throw new NotFoundError("Patient not found", "NOT_FOUND");
	}

	const { patient, department, assignedDoctor, age } = result;

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
