/**
 * List Audit Logs Validation
 *
 * Endpoint: GET /api/audit/logs
 * Description: List audit logs with filtering and pagination
 * Auth: Required (AUDIT:READ permission)
 */

import { AuditEventCategory, AuditEventType } from "@hms/db";
import { z } from "zod";
import {
	AUDIT_DEFAULT_LIMIT,
	AUDIT_DEFAULT_PAGE,
	AUDIT_MAX_LIMIT,
} from "../audit.constants";

// Query parameters schema
export const listLogsQuerySchema = z.object({
	query: z.object({
		// Pagination
		page: z.coerce
			.number()
			.int()
			.positive()
			.default(AUDIT_DEFAULT_PAGE)
			.optional(),
		limit: z.coerce
			.number()
			.int()
			.positive()
			.max(AUDIT_MAX_LIMIT)
			.default(AUDIT_DEFAULT_LIMIT)
			.optional(),

		// Filters
		category: z
			.enum([
				AuditEventCategory.AUTH,
				AuditEventCategory.PHI,
				AuditEventCategory.ADMIN,
				AuditEventCategory.SECURITY,
				AuditEventCategory.DATA,
			])
			.optional(),

		eventType: z
			.enum([
				AuditEventType.AUTH_LOGIN,
				AuditEventType.AUTH_LOGOUT,
				AuditEventType.AUTH_FAILED,
				AuditEventType.AUTH_TOKEN_REFRESH,
				AuditEventType.AUTH_PASSWORD_CHANGE,
				AuditEventType.PHI_VIEW,
				AuditEventType.PHI_CREATE,
				AuditEventType.PHI_UPDATE,
				AuditEventType.PHI_DELETE,
				AuditEventType.PHI_EXPORT,
				AuditEventType.PHI_PRINT,
				AuditEventType.PRESCRIPTION_VIEW,
				AuditEventType.PRESCRIPTION_CREATE,
				AuditEventType.VITALS_VIEW,
				AuditEventType.VITALS_CREATE,
				AuditEventType.ADMIN_USER_CREATE,
				AuditEventType.ADMIN_USER_UPDATE,
				AuditEventType.ADMIN_USER_DEACTIVATE,
				AuditEventType.ADMIN_ROLE_CHANGE,
				AuditEventType.ADMIN_CONFIG_CHANGE,
				AuditEventType.SECURITY_MFA_ENABLE,
				AuditEventType.SECURITY_MFA_DISABLE,
				AuditEventType.SECURITY_KEY_ROTATE,
			])
			.optional(),

		userId: z.string().optional(),
		resourceType: z.string().optional(),
		resourceId: z.string().optional(),

		// Date range filters (ISO 8601 strings)
		startDate: z
			.string()
			.optional()
			.transform((val) => (val ? new Date(val) : undefined)),
		endDate: z
			.string()
			.optional()
			.transform((val) => (val ? new Date(val) : undefined)),
	}),
});

export type ListLogsInput = z.infer<typeof listLogsQuerySchema>["query"];

export interface AuditLogListItem {
	id: string;
	eventType: string;
	category: string;
	userId: string;
	userName: string;
	tenantId: string;
	resourceType?: string | null;
	resourceId?: string | null;
	action?: string | null;
	ip?: string | null;
	userAgent?: string | null;
	sessionId?: string | null;
	details?: Record<string, unknown> | null;
	timestamp: string; // ISO 8601
}

export interface ListLogsOutput {
	logs: AuditLogListItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}
