import { type mongoose, Role } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { RoleNames, RolePermissions } from "../../constants";
import { createServiceLogger } from "../logger";

const logger = createServiceLogger("systemRolesSeed");

/**
 * Seed system roles for a new tenant
 * These are the default roles that every hospital gets
 */
export async function seedSystemRoles({
	tenantId,
	session,
}: {
	tenantId: string;
	session?: mongoose.ClientSession;
}): Promise<void> {
	logger.info({ tenantId }, "Seeding system roles");

	const systemRoles = [
		{
			name: RoleNames.SUPER_ADMIN,
			description: "Platform administrator with full system access",
			permissions: RolePermissions[RoleNames.SUPER_ADMIN],
		},
		{
			name: RoleNames.HOSPITAL_ADMIN,
			description: "Hospital administrator with full tenant access",
			permissions: RolePermissions[RoleNames.HOSPITAL_ADMIN],
		},
		{
			name: RoleNames.DOCTOR,
			description: "Medical practitioner with patient and prescription access",
			permissions: RolePermissions[RoleNames.DOCTOR],
		},
		{
			name: RoleNames.NURSE,
			description:
				"Nursing staff with patient vitals and prescription read access",
			permissions: RolePermissions[RoleNames.NURSE],
		},
		{
			name: RoleNames.PHARMACIST,
			description: "Pharmacy staff with prescription and inventory access",
			permissions: RolePermissions[RoleNames.PHARMACIST],
		},
		{
			name: RoleNames.RECEPTIONIST,
			description: "Front desk staff with patient and appointment management",
			permissions: RolePermissions[RoleNames.RECEPTIONIST],
		},
	];

	for (const roleData of systemRoles) {
		try {
			// Check if role already exists
			const existingRole = await Role.findOne({
				tenantId,
				name: roleData.name,
			}).session(session ?? null);

			if (existingRole) {
				logger.debug(
					{ tenantId, roleName: roleData.name },
					"System role already exists, skipping",
				);
				continue;
			}

			// Create the role
			const roleId = uuidv4();

			await Role.create(
				[
					{
						_id: roleId,
						tenantId,
						name: roleData.name,
						description: roleData.description,
						permissions: roleData.permissions,
						isSystem: true, // Mark as system role
						isActive: true,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				],
				{ session },
			);

			logger.info(
				{
					roleId,
					tenantId,
					roleName: roleData.name,
					permissionsCount: roleData.permissions.length,
				},
				"System role created",
			);
		} catch (error) {
			logger.error(
				{ tenantId, roleName: roleData.name, error },
				"Failed to create system role",
			);
			throw error;
		}
	}

	logger.info({ tenantId }, "System roles seeding completed");
}

/**
 * Verify that all system roles exist for a tenant
 */
export async function verifySystemRoles({
	tenantId,
}: {
	tenantId: string;
}): Promise<{ missingRoles: string[]; allPresent: boolean }> {
	logger.debug({ tenantId }, "Verifying system roles");

	const expectedRoles = Object.values(RoleNames);
	const existingRoles = await Role.find({
		tenantId,
		name: { $in: expectedRoles },
		isSystem: true,
	})
		.select("name")
		.lean();

	const existingRoleNames = existingRoles.map((r) => r.name as string);
	const missingRoles = expectedRoles.filter(
		(role) => !existingRoleNames.includes(role),
	);

	const allPresent = missingRoles.length === 0;

	if (!allPresent) {
		logger.warn({ tenantId, missingRoles }, "Missing system roles detected");
	} else {
		logger.debug({ tenantId }, "All system roles present");
	}

	return { missingRoles, allPresent };
}
