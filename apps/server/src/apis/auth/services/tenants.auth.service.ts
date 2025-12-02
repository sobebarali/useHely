import { createServiceLogger } from "../../../lib/logger";
import {
	findAllStaffForUser,
	findHospitalsByIds,
	findRolesByIds,
} from "../repositories/tenants.auth.repository";
import type {
	ListUserTenantsOutput,
	UserTenant,
} from "../validations/tenants.auth.validation";

const logger = createServiceLogger("tenantsAuth");

/**
 * List all tenants that a user belongs to
 *
 * This retrieves all Staff records for the user across all tenants,
 * along with hospital details and role information for each tenant.
 *
 * @param userId - The authenticated user's ID
 * @param currentTenantId - The user's current active tenant ID
 * @returns List of tenants with details and current tenant indicator
 */
export async function listUserTenants({
	userId,
	currentTenantId,
}: {
	userId: string;
	currentTenantId: string;
}): Promise<ListUserTenantsOutput> {
	logger.info({ userId, currentTenantId }, "Listing user tenants");

	// Find all staff records for this user
	const staffRecords = await findAllStaffForUser({ userId });

	if (staffRecords.length === 0) {
		logger.warn({ userId }, "No staff records found for user");
		return {
			tenants: [],
			currentTenantId,
		};
	}

	// Get unique tenant IDs and role IDs
	const tenantIds = [...new Set(staffRecords.map((s) => s.tenantId))];
	const allRoleIds = [...new Set(staffRecords.flatMap((s) => s.roles || []))];

	// Fetch hospitals and roles in parallel
	const [hospitals, roles] = await Promise.all([
		findHospitalsByIds({ hospitalIds: tenantIds }),
		allRoleIds.length > 0 ? findRolesByIds({ roleIds: allRoleIds }) : [],
	]);

	// Create lookup maps for efficient access
	const hospitalMap = new Map(hospitals.map((h) => [h._id, h]));
	const roleMap = new Map(roles.map((r) => [r._id, r]));

	// Build tenant list
	const tenants: UserTenant[] = staffRecords
		.map((staff) => {
			const hospital = hospitalMap.get(staff.tenantId);

			if (!hospital) {
				logger.warn(
					{ staffId: staff._id, tenantId: staff.tenantId },
					"Hospital not found for staff record",
				);
				return null;
			}

			// Get roles for this staff record, filtering to only roles in this tenant
			const staffRoles = (staff.roles || [])
				.map((roleId) => roleMap.get(roleId))
				.filter(
					(role): role is NonNullable<typeof role> =>
						role !== undefined && role.tenantId === staff.tenantId,
				)
				.map((role) => ({
					id: role._id,
					name: role.name,
				}));

			return {
				id: staff.tenantId,
				name: hospital.name,
				status: hospital.status,
				roles: staffRoles,
				staffStatus: staff.status,
				isCurrent: staff.tenantId === currentTenantId,
			};
		})
		.filter((tenant): tenant is UserTenant => tenant !== null);

	// Sort tenants: current first, then by name
	tenants.sort((a, b) => {
		if (a.isCurrent && !b.isCurrent) return -1;
		if (!a.isCurrent && b.isCurrent) return 1;
		return a.name.localeCompare(b.name);
	});

	logger.info(
		{
			userId,
			tenantCount: tenants.length,
			currentTenantId,
		},
		"User tenants listed successfully",
	);

	return {
		tenants,
		currentTenantId,
	};
}
