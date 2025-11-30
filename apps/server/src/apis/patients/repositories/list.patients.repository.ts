import { Patient } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("listPatients");

/**
 * List patients with pagination and filters
 * Returns raw patient data - DTO mapping should be in service layer
 */
export async function listPatients({
	tenantId,
	page,
	limit,
	patientType,
	department,
	assignedDoctor,
	status,
	startDate,
	endDate,
	search,
	sortBy,
	sortOrder,
}: {
	tenantId: string;
	page: number;
	limit: number;
	patientType?: string;
	department?: string;
	assignedDoctor?: string;
	status?: string;
	startDate?: string;
	endDate?: string;
	search?: string;
	sortBy: string;
	sortOrder: "asc" | "desc";
}) {
	try {
		logger.debug({ tenantId, page, limit }, "Listing patients");

		// Build query
		const query: Record<string, unknown> = { tenantId };

		if (patientType) {
			query.patientType = patientType;
		}

		if (department) {
			query.departmentId = department;
		}

		if (assignedDoctor) {
			query.assignedDoctorId = assignedDoctor;
		}

		if (status) {
			query.status = status;
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

		// Search in firstName, lastName, phone, email, or patientId
		if (search) {
			query.$or = [
				{ firstName: { $regex: search, $options: "i" } },
				{ lastName: { $regex: search, $options: "i" } },
				{ phone: { $regex: search, $options: "i" } },
				{ patientId: { $regex: search, $options: "i" } },
				{ email: { $regex: search, $options: "i" } },
			];
		}

		// Calculate skip
		const skip = (page - 1) * limit;

		// Build sort
		const sort: Record<string, 1 | -1> = {
			[sortBy]: sortOrder === "asc" ? 1 : -1,
		};

		// Get total count
		const total = await Patient.countDocuments(query);

		// Get patient records
		const patients = await Patient.find(query)
			.sort(sort)
			.skip(skip)
			.limit(limit)
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"patient",
			{ tenantId, page, limit },
			{ count: patients.length, total },
		);

		logger.info({ tenantId, count: patients.length, total }, "Patients listed");

		return {
			patients,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	} catch (error) {
		logError(logger, error, "Failed to list patients", { tenantId });
		throw error;
	}
}
