import { ConflictError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { createTemplate } from "../repositories/create-template.prescriptions.repository";
import {
	findStaffById,
	findTemplateByName,
} from "../repositories/shared.prescriptions.repository";
import type {
	CreateTemplateInput,
	CreateTemplateOutput,
} from "../validations/create-template.prescriptions.validation";

const logger = createServiceLogger("createTemplate");

/**
 * Create a new prescription template
 */
export async function createTemplateService({
	tenantId,
	createdBy,
	name,
	category,
	condition,
	medicines,
}: {
	tenantId: string;
	createdBy: string;
} & CreateTemplateInput): Promise<CreateTemplateOutput> {
	logger.info({ tenantId, name, createdBy }, "Creating template");

	// Check for duplicate name
	const existingTemplate = await findTemplateByName({ tenantId, name });
	if (existingTemplate) {
		logger.warn({ tenantId, name }, "Template name already exists");
		throw new ConflictError(
			"Template with this name already exists",
			"DUPLICATE_NAME",
		);
	}

	// Get creator details
	const creator = await findStaffById({ tenantId, staffId: createdBy });

	// Create template
	const template = await createTemplate({
		tenantId,
		name,
		category,
		condition,
		medicines,
		createdBy,
	});

	logger.info({ tenantId, name }, "Template created successfully");

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
		createdBy: {
			id: String(creator?._id || createdBy),
			firstName: creator?.firstName || "",
			lastName: creator?.lastName || "",
		},
		createdAt: template.createdAt?.toISOString() || new Date().toISOString(),
	};
}
