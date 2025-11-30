import { createServiceLogger } from "../../../lib/logger";
import { listTemplates } from "../repositories/list-templates.prescriptions.repository";
import { findStaffByIds } from "../repositories/shared.prescriptions.repository";
import type {
	ListTemplatesInput,
	ListTemplatesOutput,
	TemplateOutput,
} from "../validations/list-templates.prescriptions.validation";

const logger = createServiceLogger("listTemplates");

/**
 * List prescription templates with filters
 */
export async function listTemplatesService({
	tenantId,
	category,
	search,
}: {
	tenantId: string;
} & ListTemplatesInput): Promise<ListTemplatesOutput> {
	logger.info({ tenantId, category, search }, "Listing templates");

	const templates = await listTemplates({ tenantId, category, search });

	// Get unique creator IDs for batch lookup
	const creatorIds = [
		...new Set(templates.map((t) => t.createdBy).filter(Boolean)),
	] as string[];

	// Batch fetch creators
	const creators =
		creatorIds.length > 0
			? await findStaffByIds({ tenantId, staffIds: creatorIds })
			: [];

	// Create lookup map
	const creatorMap = new Map(creators.map((c) => [String(c._id), c]));

	// Map to output DTO
	const data: TemplateOutput[] = templates.map((template) => {
		const creator = template.createdBy
			? creatorMap.get(String(template.createdBy))
			: undefined;

		return {
			id: String(template._id),
			name: template.name,
			category: template.category,
			condition: template.condition,
			medicines: template.medicines.map((med) => ({
				id: String(med._id),
				name: med.name,
				dosage: med.dosage,
				frequency: med.frequency,
				duration: med.duration,
				route: med.route,
				instructions: med.instructions,
			})),
			createdBy: creator
				? {
						id: String(creator._id),
						firstName: creator.firstName,
						lastName: creator.lastName,
					}
				: undefined,
			isSystem: template.isSystem || false,
		};
	});

	logger.info(
		{ tenantId, count: templates.length },
		"Templates listed successfully",
	);

	return {
		data,
		count: templates.length,
	};
}
