import { Patient } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("searchPatients");

/**
 * Search patients with optimized lookup
 */
export async function searchPatients({
	tenantId,
	q,
	type,
	limit,
}: {
	tenantId: string;
	q: string;
	type?: "id" | "name" | "phone" | "email";
	limit: number;
}) {
	try {
		logger.debug({ tenantId, q, type, limit }, "Searching patients");

		// Build query based on search type
		const query: Record<string, unknown> = { tenantId };

		if (type === "id") {
			// Exact match on patient ID
			query.patientId = q;
		} else if (type === "name") {
			// Partial match on first/last name
			query.$or = [
				{ firstName: { $regex: q, $options: "i" } },
				{ lastName: { $regex: q, $options: "i" } },
			];
		} else if (type === "phone") {
			// Partial match on phone
			query.phone = { $regex: q, $options: "i" };
		} else if (type === "email") {
			// Exact match on email (case insensitive)
			query.email = { $regex: `^${q}$`, $options: "i" };
		} else {
			// Default: search across multiple fields
			query.$or = [
				{ patientId: { $regex: q, $options: "i" } },
				{ firstName: { $regex: q, $options: "i" } },
				{ lastName: { $regex: q, $options: "i" } },
				{ phone: { $regex: q, $options: "i" } },
				{ email: { $regex: q, $options: "i" } },
			];
		}

		// Get patient records
		const patients = await Patient.find(query)
			.sort({ createdAt: -1 })
			.limit(limit)
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"patient",
			{ tenantId, q, type },
			{ count: patients.length },
		);

		// Map to output format
		const results = patients.map((patient) => ({
			id: String(patient._id),
			patientId: patient.patientId,
			firstName: patient.firstName,
			lastName: patient.lastName,
			phone: patient.phone,
			email: patient.email || undefined,
			patientType: patient.patientType,
			status: patient.status || "ACTIVE",
		}));

		logger.info(
			{ tenantId, q, count: results.length },
			"Patients search completed",
		);

		return {
			results,
			count: results.length,
		};
	} catch (error) {
		logError(logger, error, "Failed to search patients", { tenantId, q });
		throw error;
	}
}
