import { PrescriptionTemplate } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { TemplateMedicineInput } from "../validations/create-template.prescriptions.validation";
import type { PrescriptionTemplateLean } from "./shared.prescriptions.repository";

const logger = createRepositoryLogger("createTemplate");

/**
 * Create a new prescription template
 */
export async function createTemplate({
	tenantId,
	name,
	category,
	condition,
	medicines,
	createdBy,
}: {
	tenantId: string;
	name: string;
	category?: string;
	condition?: string;
	medicines: TemplateMedicineInput[];
	createdBy: string;
}): Promise<PrescriptionTemplateLean> {
	try {
		const id = uuidv4();

		logger.debug({ id, tenantId, name }, "Creating template");

		// Map medicines - Mongoose will auto-generate ObjectId for _id
		const medicinesWithDefaults = medicines.map((med) => ({
			name: med.name,
			dosage: med.dosage,
			frequency: med.frequency,
			duration: med.duration,
			route: med.route,
			instructions: med.instructions,
		}));

		const template = await PrescriptionTemplate.create({
			_id: id,
			tenantId,
			name,
			category,
			condition,
			medicines: medicinesWithDefaults,
			isSystem: false,
			createdBy,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"prescriptionTemplate",
			{ tenantId, name },
			{ _id: template._id },
		);

		logger.info({ id, tenantId, name }, "Template created successfully");

		// Convert to lean and return with proper type
		return template.toObject() as unknown as PrescriptionTemplateLean;
	} catch (error) {
		logError(logger, error, "Failed to create template", { tenantId });
		throw error;
	}
}
