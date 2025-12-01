import { Department } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { UpdateDepartmentBody } from "../validations/update.departments.validation";

const logger = createRepositoryLogger("updateDepartment");

/**
 * Update a department in the database
 */
export async function updateDepartment({
	tenantId,
	departmentId,
	data,
}: {
	tenantId: string;
	departmentId: string;
	data: UpdateDepartmentBody;
}) {
	try {
		logger.debug({ tenantId, departmentId }, "Updating department");

		const updateFields: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		if (data.name !== undefined) {
			updateFields.name = data.name;
		}

		if (data.description !== undefined) {
			updateFields.description = data.description;
		}

		if (data.headId !== undefined) {
			updateFields.headId = data.headId;
		}

		if (data.parentId !== undefined) {
			updateFields.parentId = data.parentId;
		}

		if (data.location !== undefined) {
			updateFields.location = data.location;
		}

		if (data.contactPhone !== undefined) {
			updateFields["contact.phone"] = data.contactPhone;
		}

		if (data.contactEmail !== undefined) {
			updateFields["contact.email"] = data.contactEmail;
		}

		if (data.operatingHours !== undefined) {
			updateFields.operatingHours = data.operatingHours;
		}

		const department = await Department.findOneAndUpdate(
			{ _id: departmentId, tenantId },
			{ $set: updateFields },
			{ new: true },
		).lean();

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"department",
			{ tenantId, departmentId },
			department ? { _id: department._id, updated: true } : { updated: false },
		);

		return department;
	} catch (error) {
		logError(logger, error, "Failed to update department");
		throw error;
	}
}
