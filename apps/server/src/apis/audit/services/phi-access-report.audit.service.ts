/**
 * PHI Access Report Service
 *
 * Business logic for generating PHI access reports
 */

import { createServiceLogger, logSuccess } from "@/lib/logger";
import { AUDIT_DEFAULT_LIMIT, AUDIT_DEFAULT_PAGE } from "../audit.constants";
import { findPhiAccessLogs } from "../repositories/phi-access-report.audit.repository";
import type {
	PhiAccessReportInput,
	PhiAccessReportOutput,
} from "../validations/phi-access-report.audit.validation";

const logger = createServiceLogger("phiAccessReport");

interface PhiAccessReportParams extends PhiAccessReportInput {
	tenantId: string;
}

export async function generatePhiAccessReport(
	params: PhiAccessReportParams,
): Promise<PhiAccessReportOutput> {
	const { tenantId, patientId, userId } = params;

	// Ensure dates are Date objects (query params may be strings)
	const startDate =
		params.startDate instanceof Date
			? params.startDate
			: new Date(params.startDate as unknown as string);
	const endDate =
		params.endDate instanceof Date
			? params.endDate
			: new Date(params.endDate as unknown as string);

	// Ensure page and limit are numbers (query params may be strings)
	const page = Number(params.page) || AUDIT_DEFAULT_PAGE;
	const limit = Number(params.limit) || AUDIT_DEFAULT_LIMIT;

	const { logs, total } = await findPhiAccessLogs({
		tenantId,
		startDate,
		endDate,
		patientId,
		userId,
		page,
		limit,
	});

	const totalPages = Math.ceil(total / limit);

	// Transform to output format
	const transformedLogs = logs.map((log) => ({
		id: log._id,
		eventType: log.eventType,
		userId: log.userId,
		userName: log.userName,
		patientId: log.resourceId,
		action: log.action,
		fieldsAccessed: log.details?.fieldsAccessed,
		ip: log.ip,
		timestamp: log.timestamp.toISOString(),
	}));

	const result: PhiAccessReportOutput = {
		period: {
			start: startDate.toISOString(),
			end: endDate.toISOString(),
		},
		filters: {
			...(patientId && { patientId }),
			...(userId && { userId }),
		},
		logs: transformedLogs,
		pagination: {
			page,
			limit,
			total,
			totalPages,
		},
	};

	logSuccess(
		logger,
		{ count: transformedLogs.length, total },
		"PHI access report generated",
	);

	return result;
}
