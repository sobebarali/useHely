import { BadRequestError, InvalidCredentialsError } from "../../../errors";
import { invalidateAllUserSessions } from "../../../lib/cache/auth.cache";
import { createServiceLogger } from "../../../lib/logger";
import { comparePassword, hashPassword } from "../../../utils/crypto";
import { findAccountByUserId } from "../repositories/change-password.users.repository";
import {
	checkPasswordHistory,
	updatePassword,
} from "../repositories/reset-password.users.repository";
import {
	findStaffByUserId,
	invalidateUserSessions,
} from "../repositories/shared.users.repository";
import type {
	ChangePasswordInput,
	ChangePasswordOutput,
} from "../validations/change-password.users.validation";

const logger = createServiceLogger("changePassword");

/**
 * Change password for authenticated user
 */
export async function changePasswordService({
	userId,
	data,
}: {
	userId: string;
	data: ChangePasswordInput;
}): Promise<ChangePasswordOutput> {
	const { currentPassword, newPassword } = data;

	logger.info({ userId }, "Password change attempt");

	// Find account
	const account = await findAccountByUserId({ userId });
	if (!account || !account.password) {
		logger.warn({ userId }, "Account not found");
		throw new InvalidCredentialsError();
	}

	// Verify current password
	const isValidPassword = await comparePassword(
		currentPassword,
		account.password,
	);
	if (!isValidPassword) {
		logger.warn({ userId }, "Invalid current password");
		throw new InvalidCredentialsError();
	}

	// Find staff record
	const staff = await findStaffByUserId({ userId });
	if (!staff) {
		logger.warn({ userId }, "Staff not found");
		throw new BadRequestError("User record not found", "USER_NOT_FOUND");
	}

	// Check password history
	const isReused = await checkPasswordHistory({
		staffId: String(staff._id),
		newPassword,
	});

	if (isReused) {
		logger.warn({ userId }, "Password reuse attempt");
		throw new BadRequestError(
			"Cannot reuse any of your last 3 passwords",
			"PASSWORD_REUSE",
		);
	}

	// Hash new password
	const hashedPassword = await hashPassword(newPassword);

	// Update password
	await updatePassword({
		userId,
		hashedPassword,
		staffId: String(staff._id),
	});

	// Invalidate all sessions
	await invalidateUserSessions({ userId });
	await invalidateAllUserSessions({ userId });

	logger.info({ userId }, "Password changed successfully");

	return {
		message:
			"Password has been changed successfully. Please log in with your new password.",
	};
}
