import { ForbiddenError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { deleteTemplate } from "../repositories/delete-template.prescriptions.repository";
import { findTemplateById } from "../repositories/shared.prescriptions.repository";
import type { DeleteTemplateOutput } from "../validations/delete-template.prescriptions.validation";

const logger = createServiceLogger("deleteTemplate");

/**
 * Delete a prescription template
 */
export async function deleteTemplateService({
	tenantId,
	templateId,
	staffId,
	isAdmin,
}: {
	tenantId: string;
	templateId: string;
	staffId: string;
	isAdmin: boolean;
}): Promise<DeleteTemplateOutput> {
	logger.info({ tenantId, templateId }, "Deleting template");

	// Get existing template
	const existingTemplate = await findTemplateById({ tenantId, templateId });

	if (!existingTemplate) {
		logger.warn({ tenantId, templateId }, "Template not found");
		throw new NotFoundError("Template not found", "TEMPLATE_NOT_FOUND");
	}

	// Check if system template
	if (existingTemplate.isSystem) {
		logger.warn({ tenantId, templateId }, "Cannot delete system template");
		throw new ForbiddenError(
			"Cannot delete system templates",
			"SYSTEM_TEMPLATE",
		);
	}

	// Check ownership (only creator or admin can delete)
	if (!isAdmin && existingTemplate.createdBy !== staffId) {
		logger.warn(
			{ tenantId, templateId, staffId },
			"Only template creator or admin can delete",
		);
		throw new ForbiddenError(
			"Only template creator or admin can delete this template",
			"NOT_TEMPLATE_OWNER",
		);
	}

	// Delete template
	const deleted = await deleteTemplate({
		tenantId,
		templateId,
	});

	if (!deleted) {
		throw new NotFoundError("Template not found", "TEMPLATE_NOT_FOUND");
	}

	logger.info({ tenantId, templateId }, "Template deleted successfully");

	return {
		message: "Template deleted successfully",
	};
}
