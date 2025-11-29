import { Role } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("createRole");

/**
 * Check if role name already exists for tenant
 */
export async function findRoleByName({
	tenantId,
	name,
}: {
	tenantId: string;
	name: string;
}) {
	try {
		logger.debug({ tenantId, name }, "Checking for existing role");

		const role = await Role.findOne({ tenantId, name }).lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"role",
			{ tenantId, name },
			role ? { _id: role._id, found: true } : { found: false },
		);

		return role;
	} catch (error) {
		logError(logger, error, "Failed to check for existing role");
		throw error;
	}
}

/**
 * Create a new role
 */
export async function createRole({
	tenantId,
	name,
	description,
	permissions,
}: {
	tenantId: string;
	name: string;
	description?: string;
	permissions: string[];
}) {
	try {
		const roleId = uuidv4();

		logger.debug({ roleId, tenantId, name }, "Creating role");

		const role = await Role.create({
			_id: roleId,
			tenantId,
			name,
			description,
			permissions,
			isSystem: false, // Custom roles are not system roles
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"role",
			{ tenantId, name },
			{ _id: role._id },
		);

		logger.info({ roleId, tenantId, name }, "Role created");

		return role;
	} catch (error) {
		logError(logger, error, "Failed to create role", { tenantId, name });
		throw error;
	}
}
