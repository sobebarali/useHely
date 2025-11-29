import {
	hasHigherOrEqualAuthority,
	type Permission,
	type RoleName,
	RolePermissions,
} from "../../../constants";
import { ConflictError, ForbiddenError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import {
	createRole,
	findRoleByName,
} from "../repositories/create.roles.repository";
import type {
	CreateRoleInput,
	CreateRoleOutput,
} from "../validations/create.roles.validation";

const logger = createServiceLogger("createRole");

/**
 * Create a new custom role
 */
export async function createRoleService({
	tenantId,
	data,
	userRoles,
	userPermissions,
}: {
	tenantId: string;
	data: CreateRoleInput;
	userRoles: string[];
	userPermissions: string[];
}): Promise<CreateRoleOutput> {
	const { name, description, permissions } = data;

	logger.info({ tenantId, roleName: name }, "Creating new role");

	// Check if role name already exists
	const existingRole = await findRoleByName({ tenantId, name });
	if (existingRole) {
		logger.warn({ tenantId, name }, "Role name already exists");
		throw new ConflictError(
			"A role with this name already exists",
			"ROLE_EXISTS",
		);
	}

	// Validate that user has permission to grant all requested permissions
	// User cannot create a role with permissions they don't have
	const missingPermissions = permissions.filter(
		(perm) =>
			!userPermissions.includes(perm) &&
			!userPermissions.includes(`${perm.split(":")[0]}:MANAGE`),
	);

	if (missingPermissions.length > 0) {
		logger.warn(
			{
				tenantId,
				requestedPermissions: permissions,
				missingPermissions,
			},
			"User attempted to grant permissions they don't have",
		);
		throw new ForbiddenError(
			"You cannot grant permissions you don't have",
			"PERMISSION_DENIED",
		);
	}

	// Validate that user cannot create a role higher than their own
	// Find the highest role level the user has
	const userRoleNames = userRoles as RoleName[];
	const userHighestRole = userRoleNames.reduce<RoleName | null>(
		(highest, role) => {
			if (!highest) return role;
			return hasHigherOrEqualAuthority(role, highest) ? role : highest;
		},
		null,
	);

	// Check if the new role would have more permissions than any system role the user can manage
	if (
		userHighestRole &&
		userHighestRole !== "SUPER_ADMIN" &&
		userHighestRole !== "HOSPITAL_ADMIN"
	) {
		const userRolePermissions = RolePermissions[userHighestRole] || [];
		const excessPermissions = permissions.filter(
			(perm) => !userRolePermissions.includes(perm as Permission),
		);

		if (excessPermissions.length > 0) {
			logger.warn(
				{
					userRole: userHighestRole,
					excessPermissions,
				},
				"Custom role would exceed user's authority",
			);
			throw new ForbiddenError(
				"Custom role would have permissions beyond your authority",
				"PERMISSION_DENIED",
			);
		}
	}

	// Create the role
	const role = await createRole({
		tenantId,
		name,
		description,
		permissions,
	});

	logger.info(
		{
			roleId: role._id,
			tenantId,
			name,
			permissionsCount: permissions.length,
		},
		"Role created successfully",
	);

	return {
		id: String(role._id),
		name: role.name,
		description: role.description || undefined,
		permissions: role.permissions || [],
		isSystem: role.isSystem || false,
		isActive: role.isActive ?? true,
		tenantId: String(role.tenantId),
		createdAt: role.createdAt?.toISOString() || new Date().toISOString(),
	};
}
