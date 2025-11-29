import { BadRequestError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { searchPatients } from "../repositories/search.patients.repository";
import type { SearchPatientsInput } from "../validations/search.patients.validation";

const logger = createServiceLogger("searchPatients");

/**
 * Search patients within the hospital tenant
 */
export async function searchPatientsService({
	tenantId,
	q,
	type,
	limit: limitParam,
}: {
	tenantId: string;
} & SearchPatientsInput) {
	logger.info({ tenantId, q, type }, "Searching patients");

	// Validate query length
	if (q.length < 2) {
		throw new BadRequestError(
			"Search query must be at least 2 characters",
			"INVALID_QUERY",
		);
	}

	const limit = Number(limitParam) || 10;

	const result = await searchPatients({
		tenantId,
		q,
		type,
		limit,
	});

	logger.info(
		{
			tenantId,
			q,
			count: result.count,
		},
		"Patients search completed",
	);

	return result;
}
