import { ForbiddenError, InternalError, NotFoundError } from "../../../errors";
import { invalidateAllUserSessions } from "../../../lib/cache/auth.cache";
import { createServiceLogger } from "../../../lib/logger";
import { deactivateStaff } from "../repositories/deactivate.users.repository";
import {
	findStaffById,
	invalidateUserSessions,
} from "../repositories/shared.users.repository";
import type { DeactivateUserOutput } from "../validations/deactivate.users.validation";

const logger = createServiceLogger("deactivateUser");

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUserService({
	tenantId,
	userId,
	requesterId,
}: {
	tenantId: string;
	userId: string;
	requesterId: string;
}): Promise<DeactivateUserOutput> {
	logger.info({ tenantId, userId }, "Deactivating user");

	// Check if trying to deactivate self
	const existingStaff = await findStaffById({ tenantId, staffId: userId });
	if (!existingStaff) {
		logger.warn({ tenantId, userId }, "User not found");
		throw new NotFoundError("User not found");
	}

	// Check if trying to deactivate own account
	if (String(existingStaff._id) === requesterId) {
		logger.warn({ tenantId, userId }, "User tried to deactivate self");
		throw new ForbiddenError(
			"Cannot deactivate your own account",
			"SELF_DEACTIVATION",
		);
	}

	// Deactivate the staff record
	const deactivatedStaff = await deactivateStaff({ tenantId, staffId: userId });
	if (!deactivatedStaff) {
		throw new InternalError("Failed to deactivate user");
	}

	// Invalidate all sessions in database
	await invalidateUserSessions({ userId: String(existingStaff.userId) });

	// Invalidate all cached sessions
	await invalidateAllUserSessions({ userId: String(existingStaff.userId) });

	logger.info({ userId, tenantId }, "User deactivated successfully");

	return {
		id: String(deactivatedStaff._id),
		status: deactivatedStaff.status || "INACTIVE",
		deactivatedAt:
			deactivatedStaff.deactivatedAt?.toISOString() || new Date().toISOString(),
	};
}
