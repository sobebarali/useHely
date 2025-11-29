import { User } from "@hms/db";
import {
	BadRequestError,
	ForbiddenError,
	InternalError,
	NotFoundError,
} from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import {
	findDepartmentById,
	findStaffById,
	getRolesByIds,
} from "../repositories/shared.users.repository";
import { updateStaff } from "../repositories/update.users.repository";
import type {
	UpdateUserInput,
	UpdateUserOutput,
} from "../validations/update.users.validation";

const logger = createServiceLogger("updateUser");

/**
 * Update user information
 */
export async function updateUserService({
	tenantId,
	userId,
	data,
	requesterId,
	requesterRoles,
}: {
	tenantId: string;
	userId: string;
	data: UpdateUserInput;
	requesterId: string;
	requesterRoles: string[];
}): Promise<UpdateUserOutput> {
	logger.info({ tenantId, userId }, "Updating user");

	// Check if user exists
	const existingStaff = await findStaffById({ tenantId, staffId: userId });
	if (!existingStaff) {
		logger.warn({ tenantId, userId }, "User not found");
		throw new NotFoundError("User not found");
	}

	// Validate department if provided
	if (data.department) {
		const department = await findDepartmentById({
			tenantId,
			departmentId: data.department,
		});
		if (!department) {
			logger.warn(
				{ tenantId, department: data.department },
				"Department not found",
			);
			throw new BadRequestError("Invalid department", "INVALID_REQUEST");
		}
	}

	// Validate roles if provided
	if (data.roles) {
		// Only admins can update roles
		const isAdmin =
			requesterRoles.includes("HOSPITAL_ADMIN") ||
			requesterRoles.includes("SUPER_ADMIN");
		if (!isAdmin) {
			logger.warn(
				{ tenantId, requesterId },
				"Non-admin trying to update roles",
			);
			throw new ForbiddenError(
				"Only administrators can update user roles",
				"FORBIDDEN",
			);
		}

		const roles = await getRolesByIds({ tenantId, roleIds: data.roles });
		if (roles.length !== data.roles.length) {
			logger.warn({ tenantId, roles: data.roles }, "Invalid role IDs");
			throw new BadRequestError(
				"One or more role IDs are invalid",
				"INVALID_ROLE",
			);
		}
	}

	// Update staff
	const updatedStaff = await updateStaff({ tenantId, staffId: userId, data });
	if (!updatedStaff) {
		throw new InternalError("Failed to update user");
	}

	// Get user email
	const user = await User.findById(updatedStaff.userId).lean();

	// Get roles for response
	const roleIds = updatedStaff.roles || [];
	const roles = await getRolesByIds({ tenantId, roleIds: roleIds as string[] });

	logger.info({ userId, tenantId }, "User updated successfully");

	return {
		id: String(updatedStaff._id),
		username: `${updatedStaff.firstName?.toLowerCase()}.${updatedStaff.lastName?.toLowerCase()}`,
		email: user?.email || "",
		firstName: updatedStaff.firstName || "",
		lastName: updatedStaff.lastName || "",
		phone: updatedStaff.phone || "",
		department: String(updatedStaff.departmentId || ""),
		specialization: updatedStaff.specialization || undefined,
		shift: updatedStaff.shift || undefined,
		roles: roles.map((r) => ({
			id: String(r._id),
			name: r.name,
		})),
		status: updatedStaff.status || "ACTIVE",
		updatedAt:
			updatedStaff.updatedAt?.toISOString() || new Date().toISOString(),
	};
}
