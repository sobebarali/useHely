import { BadRequestError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { listPatients } from "../repositories/list.patients.repository";
import { findDepartmentsByIds } from "../repositories/shared.patients.repository";
import type {
	ListPatientsInput,
	ListPatientsOutput,
} from "../validations/list.patients.validation";

const logger = createServiceLogger("listPatients");

/**
 * List patients within the hospital tenant
 */
export async function listPatientsService({
	tenantId,
	page: pageParam,
	limit: limitParam,
	patientType,
	department,
	assignedDoctor,
	status,
	startDate,
	endDate,
	search,
	sortBy: sortByParam,
	sortOrder: sortOrderParam,
}: {
	tenantId: string;
} & ListPatientsInput): Promise<{
	data: ListPatientsOutput[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}> {
	logger.info(
		{ tenantId, page: pageParam, limit: limitParam },
		"Listing patients",
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

	const result = await listPatients({
		tenantId,
		page,
		limit,
		patientType,
		department,
		assignedDoctor,
		status,
		startDate,
		endDate,
		search,
		sortBy,
		sortOrder,
	});

	// Get all unique department IDs for batch lookup
	const departmentIds = [
		...new Set(
			result.patients.map((p) => p.departmentId).filter(Boolean) as string[],
		),
	];

	// Fetch departments in a single batch query
	const departments =
		departmentIds.length > 0
			? await findDepartmentsByIds({ departmentIds })
			: [];
	const departmentMap = new Map(
		departments.map((d) => [String(d._id), d.name]),
	);

	// Map to output DTO (business logic belongs in service layer)
	const data: ListPatientsOutput[] = result.patients.map((patient) => ({
		id: String(patient._id),
		patientId: patient.patientId,
		firstName: patient.firstName,
		lastName: patient.lastName,
		dateOfBirth: patient.dateOfBirth?.toISOString() || "",
		gender: patient.gender,
		phone: patient.phone,
		patientType: patient.patientType,
		department: patient.departmentId
			? departmentMap.get(String(patient.departmentId)) || ""
			: "",
		status: patient.status || "ACTIVE",
		createdAt: patient.createdAt?.toISOString() || new Date().toISOString(),
	}));

	logger.info(
		{
			tenantId,
			page,
			limit,
			total: result.total,
		},
		"Patients listed successfully",
	);

	return {
		data,
		total: result.total,
		page: result.page,
		limit: result.limit,
		totalPages: result.totalPages,
	};
}
