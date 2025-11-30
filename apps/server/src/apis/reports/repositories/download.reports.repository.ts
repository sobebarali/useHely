/**
 * Download reports repository
 *
 * Database operations for GET /api/reports/:reportId/download
 */

import { Report } from "@hms/db";

/**
 * Get report for download (any status - service layer handles status validation)
 */
export async function getReportForDownload({
	tenantId,
	reportId,
}: {
	tenantId: string;
	reportId: string;
}) {
	return Report.findOne({
		_id: reportId,
		tenantId,
	}).lean();
}
