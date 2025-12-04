import { createServiceLogger } from "../../../lib/logger";
import { enqueuePasswordResetEmail } from "../../../lib/queue";
import { findHospitalById } from "../../hospital/repositories/shared.hospital.repository";
import { createResetToken } from "../repositories/forgot-password.users.repository";
import {
	findStaffByUserAndTenant,
	findUserByEmail,
} from "../repositories/shared.users.repository";
import type {
	ForgotPasswordInput,
	ForgotPasswordOutput,
} from "../validations/forgot-password.users.validation";

const logger = createServiceLogger("forgotPassword");

/**
 * Initiate password reset flow
 * Always returns success to prevent email enumeration
 */
export async function forgotPasswordService({
	data,
}: {
	data: ForgotPasswordInput;
}): Promise<ForgotPasswordOutput> {
	const { email, tenant_id } = data;

	logger.info(
		{ email: `****@${email.split("@")[1]}` },
		"Password reset requested",
	);

	try {
		// Find user by email
		const user = await findUserByEmail({ email });
		if (!user) {
			logger.debug("User not found, returning generic success");
			return {
				message:
					"If an account exists with this email, you will receive a password reset link.",
			};
		}

		// Find staff in tenant
		const staff = await findStaffByUserAndTenant({
			userId: String(user._id),
			tenantId: tenant_id,
		});
		if (!staff) {
			logger.debug("Staff not found in tenant, returning generic success");
			return {
				message:
					"If an account exists with this email, you will receive a password reset link.",
			};
		}

		// Get hospital for email
		const hospital = await findHospitalById({ hospitalId: tenant_id });
		if (!hospital) {
			logger.debug("Hospital not found, returning generic success");
			return {
				message:
					"If an account exists with this email, you will receive a password reset link.",
			};
		}

		// Create reset token
		const token = await createResetToken({
			userId: String(user._id),
			email,
		});

		// Build reset URL
		const baseUrl = process.env.CORS_ORIGIN || "";
		const resetUrl = `${baseUrl}/reset-password?token=${token}`;

		// Queue password reset email
		enqueuePasswordResetEmail({
			to: email,
			name: staff.firstName || "User",
			resetToken: token,
			resetUrl,
			expiresInMinutes: 60, // 1 hour
		}).catch((error) => {
			logger.error({ error }, "Failed to queue password reset email");
		});

		logger.info(
			{ email: `****@${email.split("@")[1]}` },
			"Password reset email queued",
		);
	} catch (error) {
		// Log error but don't expose to user
		logger.error({ error }, "Error processing password reset");
	}

	// Always return generic success message
	return {
		message:
			"If an account exists with this email, you will receive a password reset link.",
	};
}
