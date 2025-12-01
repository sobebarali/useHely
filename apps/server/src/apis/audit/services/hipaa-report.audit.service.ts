/**
 * HIPAA Report Service
 *
 * Business logic for generating HIPAA compliance reports
 */

import { v4 as uuidv4 } from "uuid";
import { createServiceLogger, logSuccess } from "@/lib/logger";
import {
	getAuditStats,
	getPhiAccessByRole,
	getPhiAccessByUser,
	getSecurityIncidents,
} from "../repositories/shared.audit.repository";
import type {
	HipaaReportInput,
	HipaaReportOutput,
} from "../validations/hipaa-report.audit.validation";

const logger = createServiceLogger("hipaaReport");

interface HipaaReportParams extends HipaaReportInput {
	tenantId: string;
}

export async function generateHipaaReport(
	params: HipaaReportParams,
): Promise<HipaaReportOutput> {
	const { tenantId } = params;

	// Ensure dates are Date objects (query params may be strings)
	const startDate =
		params.startDate instanceof Date
			? params.startDate
			: new Date(params.startDate);
	const endDate =
		params.endDate instanceof Date ? params.endDate : new Date(params.endDate);

	// Run all aggregations in parallel for efficiency
	const [stats, phiByUser, phiByRole, incidents] = await Promise.all([
		getAuditStats({ tenantId, startDate, endDate }),
		getPhiAccessByUser({ tenantId, startDate, endDate }),
		getPhiAccessByRole({ tenantId, startDate, endDate }),
		getSecurityIncidents({ tenantId, startDate, endDate }),
	]);

	const reportId = uuidv4();

	const result: HipaaReportOutput = {
		reportId,
		period: {
			start: startDate.toISOString(),
			end: endDate.toISOString(),
		},
		summary: {
			totalEvents: stats.totalEvents,
			phiAccessEvents: stats.phiAccessEvents,
			uniqueUsers: stats.uniqueUsers,
			uniquePatients: stats.uniquePatients,
			failedAccessAttempts: stats.failedAccessAttempts,
			securityEvents: stats.securityEvents,
		},
		phiAccessByUser: phiByUser.map((u) => ({
			userId: u.userId,
			userName: u.userName,
			accessCount: u.accessCount,
			uniquePatients: u.uniquePatients,
		})),
		phiAccessByRole: phiByRole,
		securityIncidents: incidents,
		generatedAt: new Date().toISOString(),
	};

	logSuccess(
		logger,
		{
			reportId,
			totalEvents: stats.totalEvents,
			phiAccessEvents: stats.phiAccessEvents,
		},
		"HIPAA report generated",
	);

	return result;
}
