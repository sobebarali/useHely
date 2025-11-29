import { InternalError, NotFoundError } from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import { setPasswordExpired } from "../repositories/force-password-change.users.repository";
import { findStaffById } from "../repositories/shared.users.repository";
import type { ForcePasswordChangeOutput } from "../validations/force-password-change.users.validation";

const logger = createServiceLogger("forcePasswordChange");

/**
 * Force user to change password on next login
 */
export async function forcePasswordChangeService({
	tenantId,
	userId,
}: {
	tenantId: string;
	userId: string;
}): Promise<ForcePasswordChangeOutput> {
	logger.info({ tenantId, userId }, "Forcing password change");

	// Check if user exists
	const staff = await findStaffById({ tenantId, staffId: userId });
	if (!staff) {
		logger.warn({ tenantId, userId }, "User not found");
		throw new NotFoundError("User not found");
	}

	// Set status to PASSWORD_EXPIRED
	const updatedStaff = await setPasswordExpired({ tenantId, staffId: userId });
	if (!updatedStaff) {
		throw new InternalError("Failed to update user status");
	}

	logger.info({ userId, tenantId }, "Password change forced successfully");

	return {
		id: String(updatedStaff._id),
		status: updatedStaff.status || "PASSWORD_EXPIRED",
		message: "User will be required to change password on next login",
	};
}
