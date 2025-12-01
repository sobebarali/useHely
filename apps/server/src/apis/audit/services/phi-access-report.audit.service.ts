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

export async function generatePhiAccessReport({
	tenantId,
	patientId,
	userId,
	startDate: startDateParam,
	endDate: endDateParam,
	page: pageParam,
	limit: limitParam,
}: {
	tenantId: string;
} & PhiAccessReportInput): Promise<PhiAccessReportOutput> {
	// Ensure dates are Date objects (query params may be strings)
	const startDate =
		startDateParam instanceof Date
			? startDateParam
			: new Date(startDateParam as unknown as string);
	const endDate =
		endDateParam instanceof Date
			? endDateParam
			: new Date(endDateParam as unknown as string);

	// Ensure page and limit are numbers (query params may be strings)
	const page = Number(pageParam) || AUDIT_DEFAULT_PAGE;
	const limit = Number(limitParam) || AUDIT_DEFAULT_LIMIT;

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
