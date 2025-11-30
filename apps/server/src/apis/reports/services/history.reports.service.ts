/**
 * History reports service
 *
 * Business logic for GET /api/reports/history
 */

import { createServiceLogger } from "../../../lib/logger";
import { getReportHistory } from "../repositories/history.reports.repository";
import type {
	HistoryReportsInput,
	HistoryReportsOutput,
} from "../validations/history.reports.validation";

const logger = createServiceLogger("historyReports");

/**
 * Get report generation history
 */
export async function historyReportsService({
	tenantId,
	page,
	limit,
	reportType,
	startDate,
	endDate,
}: HistoryReportsInput): Promise<HistoryReportsOutput> {
	logger.info(
		{ tenantId, page, limit, reportType, startDate, endDate },
		"Fetching report history",
	);

	const result = await getReportHistory({
		tenantId,
		page,
		limit,
		reportType,
		startDate,
		endDate,
	});

	logger.info(
		{ tenantId, total: result.pagination.total, returned: result.data.length },
		"Report history fetched successfully",
	);

	return result;
}
