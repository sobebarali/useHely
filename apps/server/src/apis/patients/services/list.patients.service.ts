import { BadRequestError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { listPatients } from "../repositories/list.patients.repository";
import type { ListPatientsInput } from "../validations/list.patients.validation";

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
} & ListPatientsInput) {
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

	logger.info(
		{
			tenantId,
			page,
			limit,
			total: result.total,
		},
		"Patients listed successfully",
	);

	return result;
}
