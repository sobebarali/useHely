import { NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { getTemplate } from "../repositories/get-template.prescriptions.repository";
import { findStaffById } from "../repositories/shared.prescriptions.repository";
import type { GetTemplateOutput } from "../validations/get-template.prescriptions.validation";

const logger = createServiceLogger("getTemplate");

/**
 * Get template by ID
 */
export async function getTemplateService({
	tenantId,
	templateId,
}: {
	tenantId: string;
	templateId: string;
}): Promise<GetTemplateOutput> {
	logger.info({ tenantId, templateId }, "Getting template by ID");

	const template = await getTemplate({ tenantId, templateId });

	if (!template) {
		logger.warn({ tenantId, templateId }, "Template not found");
		throw new NotFoundError("Template not found", "TEMPLATE_NOT_FOUND");
	}

	// Get creator details if exists
	const creator = template.createdBy
		? await findStaffById({ tenantId, staffId: template.createdBy })
		: undefined;

	logger.info({ tenantId, templateId }, "Template retrieved successfully");

	// Map to output DTO
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
		createdAt: template.createdAt?.toISOString() || new Date().toISOString(),
		updatedAt: template.updatedAt?.toISOString() || new Date().toISOString(),
	};
}
