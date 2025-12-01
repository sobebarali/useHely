import { Role } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("updateRole");

interface RoleLean {
	_id: string;
	tenantId: string;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Update a role by ID
 */
export async function updateRole({
	tenantId,
	roleId,
	data,
}: {
	tenantId: string;
	roleId: string;
	data: { name?: string; description?: string; permissions?: string[] };
}): Promise<RoleLean | null> {
	try {
		logger.debug({ tenantId, roleId, data }, "Updating role");

		const role = await Role.findOneAndUpdate(
			{ _id: roleId, tenantId },
			{ $set: data },
			{ new: true },
		).lean();

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"role",
			{ _id: roleId, tenantId },
			role ? { _id: role._id, updated: true } : { updated: false },
		);

		return role as RoleLean | null;
	} catch (error) {
		logError(logger, error, "Failed to update role");
		throw error;
	}
}
