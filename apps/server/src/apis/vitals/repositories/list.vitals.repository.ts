import { Vitals } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { VitalsLean } from "./shared.vitals.repository";

const logger = createRepositoryLogger("listVitals");

export interface ListVitalsResult {
	vitals: VitalsLean[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * List vitals records for a patient with pagination and filters
 */
export async function listVitals({
	tenantId,
	patientId,
	page,
	limit,
	startDate,
	endDate,
	parameter,
	admissionId,
}: {
	tenantId: string;
	patientId: string;
	page: number;
	limit: number;
	startDate?: string;
	endDate?: string;
	parameter?: string;
	admissionId?: string;
}): Promise<ListVitalsResult> {
	try {
		logger.debug(
			{ tenantId, patientId, page, limit },
			"Listing vitals for patient",
		);

		// Build query filter
		const filter: Record<string, unknown> = {
			tenantId,
			patientId,
		};

		// Date range filter
		if (startDate || endDate) {
			filter.recordedAt = {};
			if (startDate) {
				(filter.recordedAt as Record<string, Date>).$gte = new Date(startDate);
			}
			if (endDate) {
				(filter.recordedAt as Record<string, Date>).$lte = new Date(endDate);
			}
		}

		// Parameter filter - only return records that have this vital
		if (parameter) {
			filter[parameter] = { $exists: true, $ne: null };
		}

		// Admission filter
		if (admissionId) {
			filter.admissionId = admissionId;
		}

		// Get total count
		const total = await Vitals.countDocuments(filter);

		// Calculate pagination
		const skip = (page - 1) * limit;
		const totalPages = Math.ceil(total / limit);

		// Fetch vitals with pagination
		const vitals = await Vitals.find(filter)
			.sort({ recordedAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"vitals",
			{ tenantId, patientId, page, limit },
			{ total, returned: vitals.length },
		);

		return {
			vitals: vitals as unknown as VitalsLean[],
			total,
			page,
			limit,
			totalPages,
		};
	} catch (error) {
		logError(logger, error, "Failed to list vitals", { tenantId, patientId });
		throw error;
	}
}

/**
 * Get the latest vitals for each parameter for a patient
 */
export async function getLatestVitalsForPatient({
	tenantId,
	patientId,
}: {
	tenantId: string;
	patientId: string;
}): Promise<VitalsLean | null> {
	try {
		logger.debug({ tenantId, patientId }, "Getting latest vitals for patient");

		// Get the most recent vitals record
		const latestVitals = await Vitals.findOne({
			tenantId,
			patientId,
		})
			.sort({ recordedAt: -1 })
			.lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"vitals",
			{ tenantId, patientId },
			latestVitals ? { found: true } : { found: false },
		);

		return latestVitals as VitalsLean | null;
	} catch (error) {
		logError(logger, error, "Failed to get latest vitals", {
			tenantId,
			patientId,
		});
		throw error;
	}
}
