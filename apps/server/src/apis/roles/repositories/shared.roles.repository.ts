import { type mongoose, Role } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";

const logger = createRepositoryLogger("sharedRoles");

/**
 * Find a role by tenant ID and role name
 */
export async function findRoleByName({
	tenantId,
	name,
	isSystem,
	session,
}: {
	tenantId: string;
	name: string;
	isSystem?: boolean;
	session?: mongoose.ClientSession;
}) {
	try {
		logger.debug({ tenantId, name, isSystem }, "Querying role by name");

		const query: { tenantId: string; name: string; isSystem?: boolean } = {
			tenantId,
			name,
		};
		if (isSystem !== undefined) {
			query.isSystem = isSystem;
		}

		const role = await Role.findOne(query)
			.session(session ?? null)
			.lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"roles",
			query,
			role ? { _id: role._id, found: true } : { found: false },
		);

		return role;
	} catch (error) {
		logError(logger, error, "Failed to query role by name", {
			tenantId,
			name,
		});
		throw error;
	}
}

/**
 * Find a role by ID
 */
export async function findRoleById({
	tenantId,
	roleId,
	session,
}: {
	tenantId: string;
	roleId: string;
	session?: mongoose.ClientSession;
}) {
	try {
		logger.debug({ tenantId, roleId }, "Querying role by ID");

		const role = await Role.findOne({ _id: roleId, tenantId })
			.session(session ?? null)
			.lean();

		logDatabaseOperation(
			logger,
			"findOne",
			"roles",
			{ _id: roleId, tenantId },
			role ? { _id: role._id, found: true } : { found: false },
		);

		return role;
	} catch (error) {
		logError(logger, error, "Failed to query role by ID", {
			tenantId,
			roleId,
		});
		throw error;
	}
}
