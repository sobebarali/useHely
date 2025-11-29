import { Account, Staff, Verification } from "@hms/db";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import { comparePassword } from "../../../utils/crypto";

const logger = createRepositoryLogger("resetPassword");

/**
 * Find and validate reset token
 */
export async function findValidResetToken({ token }: { token: string }) {
	try {
		logger.debug("Finding reset token");

		const verification = await Verification.findOne({ value: token }).lean();

		if (!verification) {
			return null;
		}

		// Check if expired
		if (new Date(verification.expiresAt) < new Date()) {
			await Verification.deleteOne({ _id: verification._id });
			return { expired: true, verification: null };
		}

		return { expired: false, verification };
	} catch (error) {
		logError(logger, error, "Failed to find reset token");
		throw error;
	}
}

/**
 * Update password and add to history
 */
export async function updatePassword({
	userId,
	hashedPassword,
	staffId,
}: {
	userId: string;
	hashedPassword: string;
	staffId: string;
}) {
	try {
		logger.debug({ userId }, "Updating password");

		// Update account password
		const account = await Account.findOneAndUpdate(
			{ userId, providerId: "credential" },
			{
				$set: {
					password: hashedPassword,
					updatedAt: new Date(),
				},
			},
			{ new: true },
		);

		if (!account) {
			throw new Error("Account not found");
		}

		// Update staff password history
		await Staff.findByIdAndUpdate(staffId, {
			$push: {
				passwordHistory: {
					$each: [hashedPassword],
					$slice: -3, // Keep only last 3 passwords
				},
			},
			$set: {
				status: "ACTIVE", // Reset status if it was PASSWORD_EXPIRED
				updatedAt: new Date(),
			},
		});

		logDatabaseOperation(
			logger,
			"findOneAndUpdate",
			"account",
			{ userId },
			{ updated: true },
		);

		return account;
	} catch (error) {
		logError(logger, error, "Failed to update password", { userId });
		throw error;
	}
}

/**
 * Check password against history
 */
export async function checkPasswordHistory({
	staffId,
	newPassword,
}: {
	staffId: string;
	newPassword: string;
}): Promise<boolean> {
	try {
		const staff = await Staff.findById(staffId).lean();
		if (!staff || !staff.passwordHistory) {
			return false;
		}

		// Check if new password matches any of the last 3 passwords
		for (const oldHash of staff.passwordHistory) {
			const matches = await comparePassword(newPassword, oldHash as string);
			if (matches) {
				return true;
			}
		}

		return false;
	} catch (error) {
		logError(logger, error, "Failed to check password history");
		throw error;
	}
}

/**
 * Delete reset token
 */
export async function deleteResetToken({ token }: { token: string }) {
	try {
		await Verification.deleteOne({ value: token });
		logger.debug("Reset token deleted");
	} catch (error) {
		logError(logger, error, "Failed to delete reset token");
		throw error;
	}
}
