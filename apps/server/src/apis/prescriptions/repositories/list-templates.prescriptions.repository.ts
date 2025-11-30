import { PrescriptionTemplate } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { ListTemplatesInput } from "../validations/list-templates.prescriptions.validation";
import type { PrescriptionTemplateLean } from "./shared.prescriptions.repository";

const logger = createRepositoryLogger("listTemplates");

/**
 * List prescription templates with filters
 */
export async function listTemplates({
	tenantId,
	category,
	search,
}: {
	tenantId: string;
} & ListTemplatesInput): Promise<PrescriptionTemplateLean[]> {
	try {
		logger.debug({ tenantId, category, search }, "Listing templates");

		// Build query
		const query: Record<string, unknown> = { tenantId };

		if (category) {
			query.category = category;
		}

		if (search) {
			query.$or = [
				{ name: { $regex: search, $options: "i" } },
				{ condition: { $regex: search, $options: "i" } },
			];
		}

		const templates = await PrescriptionTemplate.find(query)
			.sort({ name: 1 })
			.lean();

		logDatabaseOperation(
			logger,
			"find",
			"prescriptionTemplate",
			{ tenantId, category, search },
			{ found: templates.length },
		);

		return templates as unknown as PrescriptionTemplateLean[];
	} catch (error) {
		logError(logger, error, "Failed to list templates");
		throw error;
	}
}
