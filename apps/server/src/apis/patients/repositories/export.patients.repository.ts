import { Department, Patient } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("exportPatients");

/**
 * Get patients for export with filters
 */
export async function getExportPatients({
	tenantId,
	patientType,
	department,
	startDate,
	endDate,
	limit,
}: {
	tenantId: string;
	patientType?: string;
	department?: string;
	startDate?: string;
	endDate?: string;
	limit: number;
}) {
	try {
		logger.debug({ tenantId, limit }, "Getting patients for export");

		// Build query
		const query: Record<string, unknown> = { tenantId };

		if (patientType) {
			query.patientType = patientType;
		}

		if (department) {
			query.departmentId = department;
		}

		// Date range filter
		if (startDate || endDate) {
			query.createdAt = {};
			if (startDate) {
				(query.createdAt as Record<string, Date>).$gte = new Date(startDate);
			}
			if (endDate) {
				(query.createdAt as Record<string, Date>).$lte = new Date(endDate);
			}
		}

		// Get total count first
		const total = await Patient.countDocuments(query);

		// Get patient records
		const patients = await Patient.find(query)
			.sort({ createdAt: -1 })
			.limit(limit)
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"patient",
			{ tenantId, limit },
			{ count: patients.length, total },
		);

		// Get all unique department IDs
		const departmentIds = [
			...new Set(patients.map((p) => p.departmentId).filter(Boolean)),
		];
		const departments = await Department.find({
			_id: { $in: departmentIds },
		}).lean();
		const departmentMap = new Map(departments.map((d) => [String(d._id), d]));

		// Map to export format
		const data = patients.map((patient) => {
			const department = patient.departmentId
				? departmentMap.get(String(patient.departmentId))
				: null;

			return {
				patientId: patient.patientId,
				firstName: patient.firstName,
				lastName: patient.lastName,
				dateOfBirth: patient.dateOfBirth?.toISOString().split("T")[0] || "",
				gender: patient.gender,
				phone: patient.phone,
				email: patient.email || "",
				patientType: patient.patientType,
				department: department?.name || "",
				status: patient.status || "ACTIVE",
				createdAt: patient.createdAt?.toISOString().split("T")[0] || "",
			};
		});

		logger.info(
			{ tenantId, count: data.length, total },
			"Patients retrieved for export",
		);

		return {
			data,
			total,
		};
	} catch (error) {
		logError(logger, error, "Failed to get patients for export", { tenantId });
		throw error;
	}
}
