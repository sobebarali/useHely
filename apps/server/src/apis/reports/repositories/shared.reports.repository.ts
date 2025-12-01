/**
 * Shared reports repository
 *
 * Reusable database operations for reports module
 */

import { Report, ReportStatus } from "@hms/db";

/**
 * Find report by ID within tenant
 */
export async function findReportById({
	tenantId,
	reportId,
}: {
	tenantId: string;
	reportId: string;
}) {
	return Report.findOne({ _id: reportId, tenantId }).lean();
}

/**
 * Find completed report by ID within tenant
 */
export async function findCompletedReportById({
	tenantId,
	reportId,
}: {
	tenantId: string;
	reportId: string;
}) {
	return Report.findOne({
		_id: reportId,
		tenantId,
		status: ReportStatus.COMPLETED,
	}).lean();
}

/**
 * Check if report is expired
 */
export function isReportExpired({
	expiresAt,
}: {
	expiresAt: Date | undefined;
}): boolean {
	if (!expiresAt) return false;
	return new Date() > new Date(expiresAt);
}
