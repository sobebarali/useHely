/**
 * History reports repository
 *
 * Database operations for GET /api/reports/history
 */

import { Report } from "@hms/db";
import type { HistoryReportsInput } from "../validations/history.reports.validation";

/**
 * Get paginated report history
 */
export async function getReportHistory({
	tenantId,
	page = 1,
	limit = 20,
	reportType,
	status,
	startDate,
	endDate,
}: HistoryReportsInput) {
	const query: Record<string, unknown> = { tenantId };

	// Ensure page and limit are valid numbers with defaults
	const safePage =
		Number(page) && !Number.isNaN(Number(page)) ? Number(page) : 1;
	const safeLimit =
		Number(limit) && !Number.isNaN(Number(limit)) ? Number(limit) : 20;

	if (reportType) {
		query.reportType = reportType;
	}

	if (status) {
		query.status = status;
	}

	if (startDate || endDate) {
		query.createdAt = {};
		if (startDate) {
			(query.createdAt as Record<string, unknown>).$gte = new Date(startDate);
		}
		if (endDate) {
			(query.createdAt as Record<string, unknown>).$lte = new Date(endDate);
		}
	}

	const skip = (safePage - 1) * safeLimit;

	const [data, total] = await Promise.all([
		Report.find(query)
			.select({
				_id: 1,
				reportType: 1,
				parameters: 1,
				format: 1,
				generatedBy: 1,
				generatedAt: 1,
				expiresAt: 1,
				status: 1,
			})
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(safeLimit)
			.lean(),
		Report.countDocuments(query),
	]);

	return {
		data: data.map((r) => ({
			reportId: r._id as string,
			reportType: r.reportType,
			parameters: (r.parameters as Record<string, unknown>) ?? {},
			format: r.format,
			generatedBy: r.generatedBy as { id: string; name: string },
			generatedAt: r.generatedAt?.toISOString() ?? "",
			expiresAt: r.expiresAt?.toISOString() ?? "",
			status: r.status,
		})),
		pagination: {
			page: safePage,
			limit: safeLimit,
			total,
			totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
		},
	};
}
