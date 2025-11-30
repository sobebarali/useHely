/**
 * List reports service
 *
 * Business logic for GET /api/reports
 */

import { createServiceLogger } from "../../../lib/logger";
import { REPORT_METADATA } from "../reports.constants";
import type {
	ListReportsInput,
	ListReportsOutput,
} from "../validations/list.reports.validation";

const logger = createServiceLogger("listReports");

/**
 * Get list of available report types with metadata
 * Note: This is a synchronous operation as it only returns static metadata
 */
export function listReportsService({
	tenantId,
}: ListReportsInput): ListReportsOutput {
	logger.info({ tenantId }, "Listing available report types");

	const reports = Object.values(REPORT_METADATA).map((meta) => ({
		id: meta.id,
		name: meta.name,
		description: meta.description,
		category: meta.category,
		parameters: [...meta.parameters],
		formats: [...meta.formats],
		requiredPermission: meta.requiredPermission,
	}));

	logger.info(
		{ tenantId, count: reports.length },
		"Report types listed successfully",
	);

	return { reports };
}
