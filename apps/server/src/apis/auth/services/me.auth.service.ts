import { createServiceLogger } from "../../../lib/logger";
import {
	findStaffByUserId,
	findUserById,
	getDepartmentById,
	getRolesByIds,
} from "../repositories/me.auth.repository";
import type { MeOutput, RoleOutput } from "../validations/me.auth.validation";

const logger = createServiceLogger("meAuth");

/**
 * Get current authenticated user's profile with roles and permissions
 */
export async function getCurrentUser({
	userId,
}: {
	userId: string;
}): Promise<MeOutput> {
	logger.debug({ userId }, "Getting current user profile");

	// Find user
	const user = await findUserById({ userId });

	if (!user) {
		logger.warn({ userId }, "User not found");
		throw {
			status: 401,
			code: "UNAUTHORIZED",
			message: "User not found",
		};
	}

	// Find staff record
	const staff = await findStaffByUserId({ userId });

	if (!staff) {
		// User exists but not associated with any tenant
		logger.debug({ userId }, "User has no staff record");

		const firstName = user.name?.split(" ")[0] || "";
		const lastName = user.name?.split(" ").slice(1).join(" ") || "";

		const username = user.email.split("@")[0] ?? "";

		return {
			id: String(user._id),
			username,
			email: user.email,
			firstName,
			lastName,
			tenantId: "",
			roles: [],
			permissions: [],
			attributes: {},
		};
	}

	// Get roles with full details
	const roles = staff.roles
		? await getRolesByIds({ roleIds: staff.roles as string[] })
		: [];

	const roleOutputs: RoleOutput[] = roles.map((r) => ({
		id: String(r._id),
		name: r.name,
		description: r.description || undefined,
	}));

	// Collect all permissions from roles
	const permissions = roles.flatMap((r) => r.permissions || []);
	const uniquePermissions = [...new Set(permissions)];

	// Get department name if available
	let departmentName: string | undefined;
	if (staff.departmentId) {
		const department = await getDepartmentById({
			departmentId: String(staff.departmentId),
		});
		departmentName = department?.name;
	}

	logger.debug(
		{
			userId,
			tenantId: staff.tenantId,
			roles: roleOutputs.map((r) => r.name),
		},
		"User profile retrieved",
	);

	const staffFirstName = staff.firstName || user.name?.split(" ")[0] || "";
	const staffLastName =
		staff.lastName || user.name?.split(" ").slice(1).join(" ") || "";
	const staffUsername = user.email.split("@")[0] ?? "";

	return {
		id: String(user._id),
		username: staffUsername,
		email: user.email,
		firstName: staffFirstName,
		lastName: staffLastName,
		tenantId: String(staff.tenantId),
		department: departmentName,
		roles: roleOutputs,
		permissions: uniquePermissions,
		attributes: {
			department: staff.departmentId ? String(staff.departmentId) : undefined,
			specialization: staff.specialization || undefined,
			shift: staff.shift || undefined,
		},
	};
}
