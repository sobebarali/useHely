import { NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { getStaffById } from "../repositories/get-by-id.users.repository";
import type { GetUserByIdOutput } from "../validations/get-by-id.users.validation";

const logger = createServiceLogger("getUserById");

/**
 * Get user by ID
 */
export async function getUserByIdService({
	tenantId,
	userId,
}: {
	tenantId: string;
	userId: string;
}): Promise<GetUserByIdOutput> {
	logger.info({ tenantId, userId }, "Getting user by ID");

	const result = await getStaffById({ tenantId, staffId: userId });

	if (!result) {
		logger.warn({ tenantId, userId }, "User not found");
		throw new NotFoundError("User not found");
	}

	const { staff, user, roles } = result;

	logger.info({ userId, tenantId }, "User retrieved successfully");

	return {
		id: String(staff._id),
		username: `${staff.firstName?.toLowerCase()}.${staff.lastName?.toLowerCase()}`,
		email: user?.email || "",
		firstName: staff.firstName || "",
		lastName: staff.lastName || "",
		phone: staff.phone || "",
		department: String(staff.departmentId || ""),
		specialization: staff.specialization || undefined,
		shift: staff.shift || undefined,
		roles: roles.map((r) => ({
			id: String(r._id),
			name: r.name,
			permissions: r.permissions || [],
		})),
		status: staff.status || "ACTIVE",
		lastLogin: staff.lastLogin?.toISOString(),
		createdAt: staff.createdAt?.toISOString() || new Date().toISOString(),
		updatedAt: staff.updatedAt?.toISOString() || new Date().toISOString(),
	};
}
