import { Dispensing, Prescription } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { DispensingLean } from "./shared.dispensing.repository";

const logger = createRepositoryLogger("historyDispensing");

interface ListHistoryResult {
	records: DispensingLean[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * List dispensing history with filters
 */
export async function listDispensingHistory({
	tenantId,
	page,
	limit,
	pharmacistId,
	patientId,
	startDate,
	endDate,
	status,
}: {
	tenantId: string;
	page: number;
	limit: number;
	pharmacistId?: string;
	patientId?: string;
	startDate?: string;
	endDate?: string;
	status?: string;
}): Promise<ListHistoryResult> {
	try {
		logger.debug(
			{ tenantId, page, limit, patientId },
			"Listing dispensing history",
		);

		// Build query
		const query: Record<string, unknown> = { tenantId };

		if (pharmacistId) {
			query.assignedTo = pharmacistId;
		}

		if (status) {
			query.status = status;
		}

		if (startDate || endDate) {
			query.createdAt = {};
			if (startDate) {
				(query.createdAt as Record<string, Date>).$gte = new Date(startDate);
			}
			if (endDate) {
				(query.createdAt as Record<string, Date>).$lte = new Date(endDate);
			}
		}

		// If filtering by patientId, first get prescriptionIds for that patient
		if (patientId) {
			const prescriptions = await Prescription.find(
				{ tenantId, patientId },
				{ _id: 1 },
			).lean();
			const prescriptionIds = prescriptions.map((p) => String(p._id));

			if (prescriptionIds.length === 0) {
				// No prescriptions for this patient, return empty result
				return {
					records: [],
					total: 0,
					page,
					limit,
					totalPages: 0,
				};
			}

			query.prescriptionId = { $in: prescriptionIds };
		}

		// Build sort - most recent first
		const sort: Record<string, 1 | -1> = { createdAt: -1 };

		// Execute query with pagination
		const skip = (page - 1) * limit;

		const [records, total] = await Promise.all([
			Dispensing.find(query).sort(sort).skip(skip).limit(limit).lean(),
			Dispensing.countDocuments(query),
		]);

		logDatabaseOperation(
			logger,
			"find",
			"dispensing",
			{ tenantId, page, limit, patientId },
			{ found: records.length, total },
		);

		return {
			records: records as unknown as DispensingLean[],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	} catch (error) {
		logError(logger, error, "Failed to list dispensing history");
		throw error;
	}
}
