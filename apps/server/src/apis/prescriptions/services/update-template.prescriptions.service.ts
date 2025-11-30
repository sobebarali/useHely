import { ConflictError, ForbiddenError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import {
	findStaffById,
	findTemplateById,
	findTemplateByName,
} from "../repositories/shared.prescriptions.repository";
import { updateTemplate } from "../repositories/update-template.prescriptions.repository";
import type {
	UpdateTemplateInput,
	UpdateTemplateOutput,
} from "../validations/update-template.prescriptions.validation";

const logger = createServiceLogger("updateTemplate");

/**
 * Update a prescription template
 */
export async function updateTemplateService({
	tenantId,
	templateId,
	staffId,
	isAdmin,
	name,
	category,
	condition,
	medicines,
}: {
	tenantId: string;
	templateId: string;
	staffId: string;
	isAdmin: boolean;
} & UpdateTemplateInput): Promise<UpdateTemplateOutput> {
	logger.info({ tenantId, templateId }, "Updating template");

	// Get existing template
	const existingTemplate = await findTemplateById({ tenantId, templateId });

	if (!existingTemplate) {
		logger.warn({ tenantId, templateId }, "Template not found");
		throw new NotFoundError("Template not found", "TEMPLATE_NOT_FOUND");
	}

	// Check if system template
	if (existingTemplate.isSystem) {
		logger.warn({ tenantId, templateId }, "Cannot modify system template");
		throw new ForbiddenError(
			"Cannot modify system templates",
			"SYSTEM_TEMPLATE",
		);
	}

	// Check ownership (only creator or admin can update)
	if (!isAdmin && existingTemplate.createdBy !== staffId) {
		logger.warn(
			{ tenantId, templateId, staffId },
			"Only template creator or admin can update",
		);
		throw new ForbiddenError(
			"Only template creator or admin can update this template",
			"NOT_TEMPLATE_OWNER",
		);
	}

	// Check for duplicate name if name is being changed
	if (name && name !== existingTemplate.name) {
		const duplicateTemplate = await findTemplateByName({ tenantId, name });
		if (duplicateTemplate) {
			logger.warn({ tenantId, name }, "Template name already exists");
			throw new ConflictError(
				"Template with this name already exists",
				"DUPLICATE_NAME",
			);
		}
	}

	// Update template
	const template = await updateTemplate({
		tenantId,
		templateId,
		name,
		category,
		condition,
		medicines,
	});

	if (!template) {
		throw new NotFoundError("Template not found", "TEMPLATE_NOT_FOUND");
	}

	// Get creator details
	const creator = template.createdBy
		? await findStaffById({ tenantId, staffId: template.createdBy })
		: null;

	logger.info({ tenantId, templateId }, "Template updated successfully");

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
					firstName: creator.firstName || "",
					lastName: creator.lastName || "",
				}
			: undefined,
		updatedAt: template.updatedAt?.toISOString() || new Date().toISOString(),
	};
}
