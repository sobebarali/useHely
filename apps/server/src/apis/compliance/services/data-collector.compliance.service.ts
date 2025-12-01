/**
 * Data Collector Service
 *
 * Collects all user data for GDPR export
 */

import {
	Appointment,
	AuditLog,
	Consent,
	Prescription,
	Staff,
	User,
	Vitals,
} from "@hms/db";
import { NotFoundError } from "@/errors";
import { createServiceLogger } from "@/lib/logger";

const logger = createServiceLogger("dataCollector");

/**
 * Sanitize a value for CSV export to prevent CSV injection attacks.
 *
 * CSV injection occurs when values starting with =, +, -, @, tab, or carriage return
 * are interpreted as formulas by spreadsheet applications.
 *
 * @param value - The value to sanitize
 * @returns Sanitized string safe for CSV export
 */
function sanitizeCSVValue(value: string | undefined | null): string {
	if (value === undefined || value === null) {
		return "";
	}

	let sanitized = String(value);

	// Escape double quotes by doubling them
	sanitized = sanitized.replace(/"/g, '""');

	// Prevent CSV injection by prefixing dangerous characters with a single quote
	// These characters can trigger formula execution in Excel/Google Sheets
	if (/^[=+\-@\t\r]/.test(sanitized)) {
		sanitized = `'${sanitized}`;
	}

	return sanitized;
}

type CollectedUserData = {
	profile: {
		id: string;
		email: string;
		name: string;
		phone?: string;
		createdAt: string;
		lastLogin?: string;
	};
	account: {
		roles: string[];
		departmentId?: string;
		status: string;
	};
	appointments: Array<{
		id: string;
		date: string;
		type: string;
		status: string;
		patientId: string;
		createdAt: string;
	}>;
	prescriptions: Array<{
		id: string;
		patientId: string;
		diagnosis?: string;
		status: string;
		createdAt: string;
	}>;
	vitals: Array<{
		id: string;
		patientId: string;
		type: string;
		recordedAt: string;
	}>;
	consents: Array<{
		purpose: string;
		granted: boolean;
		grantedAt?: string;
		withdrawnAt?: string;
	}>;
	auditLog?: Array<{
		action: string;
		resourceType?: string;
		timestamp: string;
	}>;
	exportedAt: string;
};

/**
 * Collect all data associated with a user
 */
export async function collectUserData({
	tenantId,
	userId,
	includeAuditLog = true,
}: {
	tenantId: string;
	userId: string;
	includeAuditLog?: boolean;
}): Promise<CollectedUserData> {
	logger.info({ tenantId, userId }, "Collecting user data for export");

	// Fetch user profile and auth user
	const [staff, user] = await Promise.all([
		Staff.findOne({ userId, tenantId }).lean(),
		User.findById(userId).lean(),
	]);

	if (!staff || !user) {
		throw new NotFoundError("User profile not found", "USER_NOT_FOUND");
	}

	// Fetch related data in parallel
	const [appointments, prescriptions, vitals, consents, auditLogs] =
		await Promise.all([
			// Appointments where user is the doctor
			Appointment.find({
				tenantId,
				doctorId: staff._id,
			})
				.sort({ date: -1 })
				.limit(1000)
				.lean(),

			// Prescriptions created by user
			Prescription.find({
				tenantId,
				prescriberId: staff._id,
			})
				.sort({ createdAt: -1 })
				.limit(1000)
				.lean(),

			// Vitals recorded by user
			Vitals.find({
				tenantId,
				recordedBy: staff._id,
			})
				.sort({ recordedAt: -1 })
				.limit(1000)
				.lean(),

			// User's consent records
			Consent.find({
				tenantId,
				userId,
			}).lean(),

			// Audit logs (if requested)
			includeAuditLog
				? AuditLog.find({
						tenantId,
						userId,
					})
						.sort({ timestamp: -1 })
						.limit(5000)
						.lean()
				: Promise.resolve([]),
		]);

	// Build collected data object
	const collectedData: CollectedUserData = {
		profile: {
			id: userId,
			email: user.email,
			name: `${staff.firstName} ${staff.lastName}`,
			phone: staff.phone || undefined,
			createdAt: staff.createdAt?.toISOString() || new Date().toISOString(),
			lastLogin: staff.lastLogin?.toISOString(),
		},
		account: {
			roles: staff.roles || [],
			departmentId: staff.departmentId || undefined,
			status: staff.status,
		},
		appointments: appointments.map((apt) => ({
			id: String(apt._id),
			date: apt.date?.toISOString() || "",
			type: apt.type || "",
			status: apt.status || "",
			patientId: apt.patientId || "",
			createdAt: apt.createdAt?.toISOString() || "",
		})),
		prescriptions: prescriptions.map((rx) => ({
			id: String(rx._id),
			patientId: rx.patientId || "",
			diagnosis: rx.diagnosis || undefined,
			status: rx.status || "",
			createdAt: rx.createdAt?.toISOString() || "",
		})),
		vitals: vitals.map((v) => ({
			id: String(v._id),
			patientId: v.patientId || "",
			type: "vitals",
			recordedAt: v.recordedAt?.toISOString() || "",
		})),
		consents: consents.map((c) => ({
			purpose: c.purpose,
			granted: c.granted,
			grantedAt: c.grantedAt?.toISOString(),
			withdrawnAt: c.withdrawnAt?.toISOString(),
		})),
		exportedAt: new Date().toISOString(),
	};

	// Add audit log if included
	if (includeAuditLog && auditLogs.length > 0) {
		collectedData.auditLog = auditLogs.map((log) => ({
			action: log.eventType || "",
			resourceType: log.resourceType || undefined,
			timestamp: log.timestamp?.toISOString() || "",
		}));
	}

	logger.info(
		{
			tenantId,
			userId,
			appointmentsCount: appointments.length,
			prescriptionsCount: prescriptions.length,
			vitalsCount: vitals.length,
			consentsCount: consents.length,
			auditLogsCount: auditLogs.length,
		},
		"User data collected successfully",
	);

	return collectedData;
}

/**
 * Convert collected data to CSV format
 *
 * Uses sanitizeCSVValue to prevent CSV injection attacks.
 */
export function convertToCSV({
	profile,
	account,
	appointments,
	prescriptions,
	vitals,
	consents,
	auditLog,
	exportedAt,
}: CollectedUserData): string {
	const lines: string[] = [];

	// Helper to create a sanitized CSV row
	const csvRow = (...values: (string | undefined | null)[]) =>
		values.map((v) => `"${sanitizeCSVValue(v)}"`).join(",");

	// Profile section
	lines.push("=== PROFILE ===");
	lines.push("ID,Email,Name,Phone,Created At");
	lines.push(
		csvRow(
			profile.id,
			profile.email,
			profile.name,
			profile.phone,
			profile.createdAt,
		),
	);
	lines.push("");

	// Account section
	lines.push("=== ACCOUNT ===");
	lines.push("Roles,Department ID,Status");
	lines.push(
		csvRow(account.roles.join(", "), account.departmentId, account.status),
	);
	lines.push("");

	// Appointments section
	if (appointments.length > 0) {
		lines.push("=== APPOINTMENTS ===");
		lines.push("ID,Date,Type,Status,Patient ID,Created At");
		for (const apt of appointments) {
			lines.push(
				csvRow(
					apt.id,
					apt.date,
					apt.type,
					apt.status,
					apt.patientId,
					apt.createdAt,
				),
			);
		}
		lines.push("");
	}

	// Prescriptions section
	if (prescriptions.length > 0) {
		lines.push("=== PRESCRIPTIONS ===");
		lines.push("ID,Patient ID,Diagnosis,Status,Created At");
		for (const rx of prescriptions) {
			lines.push(
				csvRow(rx.id, rx.patientId, rx.diagnosis, rx.status, rx.createdAt),
			);
		}
		lines.push("");
	}

	// Vitals section
	if (vitals.length > 0) {
		lines.push("=== VITALS ===");
		lines.push("ID,Patient ID,Type,Recorded At");
		for (const v of vitals) {
			lines.push(csvRow(v.id, v.patientId, v.type, v.recordedAt));
		}
		lines.push("");
	}

	// Consents section
	if (consents.length > 0) {
		lines.push("=== CONSENTS ===");
		lines.push("Purpose,Granted,Granted At,Withdrawn At");
		for (const c of consents) {
			lines.push(
				csvRow(c.purpose, String(c.granted), c.grantedAt, c.withdrawnAt),
			);
		}
		lines.push("");
	}

	// Audit log section
	if (auditLog && auditLog.length > 0) {
		lines.push("=== AUDIT LOG ===");
		lines.push("Action,Resource Type,Timestamp");
		for (const log of auditLog) {
			lines.push(csvRow(log.action, log.resourceType, log.timestamp));
		}
	}

	lines.push("");
	lines.push(`Exported at: ${sanitizeCSVValue(exportedAt)}`);

	return lines.join("\n");
}
