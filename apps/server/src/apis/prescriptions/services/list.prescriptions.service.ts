import { BadRequestError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { listPrescriptions } from "../repositories/list.prescriptions.repository";
import {
	findPatientsByIds,
	findStaffByIds,
} from "../repositories/shared.prescriptions.repository";
import type {
	ListPrescriptionsInput,
	ListPrescriptionsOutput,
	PrescriptionSummary,
} from "../validations/list.prescriptions.validation";

const logger = createServiceLogger("listPrescriptions");

/**
 * List prescriptions with filters and pagination
 */
export async function listPrescriptionsService({
	tenantId,
	page: pageParam,
	limit: limitParam,
	patientId,
	doctorId,
	status,
	startDate,
	endDate,
	sortBy: sortByParam,
	sortOrder: sortOrderParam,
}: {
	tenantId: string;
} & ListPrescriptionsInput): Promise<ListPrescriptionsOutput> {
	logger.info(
		{ tenantId, page: pageParam, limit: limitParam },
		"Listing prescriptions",
	);

	const page = Number(pageParam) || 1;
	const limit = Number(limitParam) || 20;
	const sortBy = sortByParam || "createdAt";
	const sortOrder = sortOrderParam || "desc";

	// Validate date range if provided
	if (startDate && endDate) {
		const start = new Date(startDate);
		const end = new Date(endDate);
		if (start > end) {
			throw new BadRequestError(
				"Start date must be before end date",
				"INVALID_DATE_RANGE",
			);
		}
	}

	const result = await listPrescriptions({
		tenantId,
		page,
		limit,
		patientId,
		doctorId,
		status,
		startDate,
		endDate,
		sortBy,
		sortOrder,
	});

	// Get unique patient and doctor IDs for batch lookup
	const patientIds = [
		...new Set(result.prescriptions.map((p) => p.patientId).filter(Boolean)),
	] as string[];

	const doctorIds = [
		...new Set(result.prescriptions.map((p) => p.doctorId).filter(Boolean)),
	] as string[];

	// Batch fetch patients and doctors
	const [patients, doctors] = await Promise.all([
		patientIds.length > 0
			? findPatientsByIds({ tenantId, patientIds })
			: Promise.resolve([]),
		doctorIds.length > 0
			? findStaffByIds({ tenantId, staffIds: doctorIds })
			: Promise.resolve([]),
	]);

	// Create lookup maps
	const patientMap = new Map(patients.map((p) => [String(p._id), p]));
	const doctorMap = new Map(doctors.map((d) => [String(d._id), d]));

	// Map to output DTO
	const data: PrescriptionSummary[] = result.prescriptions.map(
		(prescription) => {
			const patient = patientMap.get(String(prescription.patientId));
			const doctor = doctorMap.get(String(prescription.doctorId));

			return {
				id: String(prescription._id),
				prescriptionId: prescription.prescriptionId,
				patient: {
					id: String(prescription.patientId),
					patientId: patient?.patientId || "",
					firstName: patient?.firstName || "",
					lastName: patient?.lastName || "",
				},
				doctor: {
					id: String(prescription.doctorId),
					firstName: doctor?.firstName || "",
					lastName: doctor?.lastName || "",
				},
				diagnosis: prescription.diagnosis,
				medicineCount: prescription.medicines?.length || 0,
				status: prescription.status || "PENDING",
				createdAt:
					prescription.createdAt?.toISOString() || new Date().toISOString(),
			};
		},
	);

	logger.info(
		{
			tenantId,
			page,
			limit,
			total: result.total,
		},
		"Prescriptions listed successfully",
	);

	return {
		data,
		pagination: {
			page: result.page,
			limit: result.limit,
			total: result.total,
			totalPages: result.totalPages,
		},
	};
}
