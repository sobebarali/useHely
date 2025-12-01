import { Prescription } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { PrescriptionLean } from "./shared.dispensing.repository";

const logger = createRepositoryLogger("pendingDispensing");

interface ListPendingResult {
	prescriptions: PrescriptionLean[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * List pending prescriptions awaiting dispensing
 */
export async function listPendingPrescriptions({
	tenantId,
	page,
	limit,
	departmentId,
	sortBy,
	sortOrder,
}: {
	tenantId: string;
	page: number;
	limit: number;
	priority?: string;
	departmentId?: string;
	sortBy: string;
	sortOrder: string;
}): Promise<ListPendingResult> {
	try {
		logger.debug({ tenantId, page, limit }, "Listing pending prescriptions");

		// Build query - only PENDING prescriptions
		const query: Record<string, unknown> = {
			tenantId,
			status: "PENDING",
		};

		if (departmentId) {
			query.departmentId = departmentId;
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
			{ tenantId, page, limit, status: "PENDING" },
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
		logError(logger, error, "Failed to list pending prescriptions");
		throw error;
	}
}

/**
 * Count urgent prescriptions (older than 30 minutes)
 */
export async function countUrgentPrescriptions({
	tenantId,
}: {
	tenantId: string;
}): Promise<number> {
	try {
		const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

		const count = await Prescription.countDocuments({
			tenantId,
			status: "PENDING",
			createdAt: { $lte: thirtyMinutesAgo },
		});

		logDatabaseOperation(
			logger,
			"countDocuments",
			"prescription",
			{ tenantId, urgent: true },
			{ count },
		);

		return count;
	} catch (error) {
		logError(logger, error, "Failed to count urgent prescriptions");
		throw error;
	}
}
