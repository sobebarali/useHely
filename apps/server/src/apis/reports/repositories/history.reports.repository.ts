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
	page,
	limit,
	reportType,
	startDate,
	endDate,
}: HistoryReportsInput) {
	const query: Record<string, unknown> = { tenantId };

	if (reportType) {
		query.reportType = reportType;
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

	const skip = (page - 1) * limit;

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
			.limit(limit)
			.lean(),
		Report.countDocuments(query),
	]);

	return {
		data: data.map((r) => ({
			reportId: r._id as string,
			reportType: r.reportType,
			parameters: r.parameters as Record<string, unknown>,
			format: r.format,
			generatedBy: r.generatedBy as { id: string; name: string },
			generatedAt: r.generatedAt?.toISOString() ?? "",
			expiresAt: r.expiresAt?.toISOString() ?? "",
			status: r.status,
		})),
		pagination: {
			page: Number(page),
			limit: Number(limit),
			total,
			totalPages: total > 0 ? Math.ceil(total / limit) : 0,
		},
	};
}
