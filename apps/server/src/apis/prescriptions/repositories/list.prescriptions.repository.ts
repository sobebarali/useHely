import { Prescription } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { PrescriptionLean } from "./shared.prescriptions.repository";

const logger = createRepositoryLogger("listPrescriptions");

interface ListPrescriptionsResult {
	prescriptions: PrescriptionLean[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * List prescriptions with filters and pagination
 */
export async function listPrescriptions({
	tenantId,
	page,
	limit,
	patientId,
	doctorId,
	status,
	startDate,
	endDate,
	sortBy,
	sortOrder,
}: {
	tenantId: string;
	page: number;
	limit: number;
	patientId?: string;
	doctorId?: string;
	status?: string;
	startDate?: string;
	endDate?: string;
	sortBy: string;
	sortOrder: string;
}): Promise<ListPrescriptionsResult> {
	try {
		logger.debug({ tenantId, page, limit }, "Listing prescriptions");

		// Build query
		const query: Record<string, unknown> = { tenantId };

		if (patientId) {
			query.patientId = patientId;
		}

		if (doctorId) {
			query.doctorId = doctorId;
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

		// Build sort
		const sort: Record<string, 1 | -1> = {
			[sortBy]: sortOrder === "asc" ? 1 : -1,
		};

		// Execute query with pagination
		const skip = (page - 1) * limit;

		const [prescriptions, total] = await Promise.all([
			Prescription.find(query).sort(sort).skip(skip).limit(limit).lean(),
			Prescription.countDocuments(query),
		]);

		logDatabaseOperation(
			logger,
			"find",
			"prescription",
			{ tenantId, page, limit },
			{ found: prescriptions.length, total },
		);

		return {
			prescriptions: prescriptions as unknown as PrescriptionLean[],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	} catch (error) {
		logError(logger, error, "Failed to list prescriptions");
		throw error;
	}
}
