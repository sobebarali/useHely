import { Department } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { CreateDepartmentInput } from "../validations/create.departments.validation";

const logger = createRepositoryLogger("createDepartment");

/**
 * Create a new department in the database
 */
export async function createDepartment({
	tenantId,
	data,
}: {
	tenantId: string;
	data: CreateDepartmentInput;
}) {
	try {
		const departmentId = uuidv4();

		logger.debug(
			{ tenantId, departmentId, code: data.code },
			"Creating department",
		);

		const department = await Department.create({
			_id: departmentId,
			tenantId,
			name: data.name,
			code: data.code,
			description: data.description,
			type: data.type,
			parentId: data.parentId || null,
			headId: data.headId || null,
			location: data.location,
			contact: {
				phone: data.contactPhone,
				email: data.contactEmail,
			},
			operatingHours: data.operatingHours,
			status: "ACTIVE",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"department",
			{ tenantId, code: data.code },
			{ _id: department._id },
		);

		return department;
	} catch (error) {
		logError(logger, error, "Failed to create department");
		throw error;
	}
}
