import { PrescriptionTemplate } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { TemplateMedicineInput } from "../validations/update-template.prescriptions.validation";
import type { PrescriptionTemplateLean } from "./shared.prescriptions.repository";

const logger = createRepositoryLogger("updateTemplate");

/**
 * Update a prescription template
 */
export async function updateTemplate({
	tenantId,
	templateId,
	name,
	category,
	condition,
	medicines,
}: {
	tenantId: string;
	templateId: string;
	name?: string;
	category?: string;
	condition?: string;
	medicines?: TemplateMedicineInput[];
}): Promise<PrescriptionTemplateLean | null> {
	try {
		logger.debug({ tenantId, templateId }, "Updating template");

		// Build update object
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		if (name !== undefined) {
			updateData.name = name;
		}

		if (category !== undefined) {
			updateData.category = category;
		}

		if (condition !== undefined) {
			updateData.condition = condition;
		}

		if (medicines !== undefined) {
			// Map medicines
			updateData.medicines = medicines.map((med) => ({
				name: med.name,
				dosage: med.dosage,
				frequency: med.frequency,
				duration: med.duration,
				route: med.route,
				instructions: med.instructions,
			}));
		}

		const template = await PrescriptionTemplate.findOneAndUpdate(
			{ _id: templateId, tenantId },
			{ $set: updateData },
			{ new: true },
		).lean();

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"prescriptionTemplate",
			{ tenantId, templateId },
			template ? { _id: template._id, updated: true } : { updated: false },
		);

		return template as unknown as PrescriptionTemplateLean | null;
	} catch (error) {
		logError(logger, error, "Failed to update template");
		throw error;
	}
}
