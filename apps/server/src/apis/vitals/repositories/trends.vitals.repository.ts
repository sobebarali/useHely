import { Vitals } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { VitalParameter } from "../validations/trends.vitals.validation";
import type { VitalsLean } from "./shared.vitals.repository";

const logger = createRepositoryLogger("trendsVitals");

export interface TrendsVitalsResult {
	vitals: VitalsLean[];
	dateRange: {
		start: Date;
		end: Date;
	};
}

/**
 * Get vitals records for trending a specific parameter
 */
export async function getVitalsForTrends({
	tenantId,
	patientId,
	parameter,
	startDate,
	endDate,
	limit,
}: {
	tenantId: string;
	patientId: string;
	parameter: VitalParameter;
	startDate?: string;
	endDate?: string;
	limit: number;
}): Promise<TrendsVitalsResult> {
	try {
		logger.debug(
			{ tenantId, patientId, parameter, limit },
			"Getting vitals for trends",
		);

		// Build query filter - only get records that have the specified parameter
		const filter: Record<string, unknown> = {
			tenantId,
			patientId,
			[parameter]: { $exists: true, $ne: null },
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

		// Fetch vitals sorted by recorded date (ascending for trends)
		const vitals = await Vitals.find(filter)
			.sort({ recordedAt: 1 })
			.limit(limit)
			.lean();

		// Determine date range
		let rangeStart: Date;
		let rangeEnd: Date;

		const firstVitals = vitals[0];
		const lastVitals = vitals[vitals.length - 1];

		if (vitals.length > 0 && firstVitals && lastVitals) {
			rangeStart = new Date(firstVitals.recordedAt);
			rangeEnd = new Date(lastVitals.recordedAt);
		} else {
			rangeStart = startDate ? new Date(startDate) : new Date();
			rangeEnd = endDate ? new Date(endDate) : new Date();
		}

		logDatabaseOperation(
			logger,
			"find",
			"vitals",
			{ tenantId, patientId, parameter, limit },
			{ total: vitals.length },
		);

		return {
			vitals: vitals as unknown as VitalsLean[],
			dateRange: {
				start: rangeStart,
				end: rangeEnd,
			},
		};
	} catch (error) {
		logError(logger, error, "Failed to get vitals for trends", {
			tenantId,
			patientId,
			parameter,
		});
		throw error;
	}
}
