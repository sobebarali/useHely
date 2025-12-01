import { Medicine } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import { escapeRegex } from "../../../utils/crypto";
import type { MedicineLean } from "./shared.inventory.repository";

const logger = createRepositoryLogger("listMedicinesInventory");

interface ListMedicinesResult {
	medicines: MedicineLean[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * List medicines with filters and pagination.
 * Search input is sanitized to prevent ReDoS attacks.
 */
export async function listMedicines({
	tenantId,
	page,
	limit,
	search,
	category,
	type,
}: {
	tenantId: string;
	page: number;
	limit: number;
	search?: string;
	category?: string;
	type?: string;
}): Promise<ListMedicinesResult> {
	try {
		logger.debug({ tenantId, page, limit }, "Listing medicines");

		const query: Record<string, unknown> = { tenantId, isActive: true };

		if (search) {
			// Escape regex special characters to prevent ReDoS
			const escapedSearch = escapeRegex(search);
			query.$or = [
				{ name: { $regex: escapedSearch, $options: "i" } },
				{ genericName: { $regex: escapedSearch, $options: "i" } },
				{ code: { $regex: escapedSearch, $options: "i" } },
			];
		}

		if (category) {
			query.category = category;
		}

		if (type) {
			query.type = type;
		}

		const skip = (page - 1) * limit;

		const [medicines, total] = await Promise.all([
			Medicine.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
			Medicine.countDocuments(query),
		]);

		logDatabaseOperation(
			logger,
			"find",
			"medicine",
			{ tenantId, page, limit },
			{ found: medicines.length, total },
		);

		return {
			medicines: medicines as unknown as MedicineLean[],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	} catch (error) {
		logError(logger, error, "Failed to list medicines");
		throw error;
	}
}
