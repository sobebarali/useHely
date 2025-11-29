import {
	invalidateAllUserSessions,
	invalidateSession,
	revokeToken,
} from "../../../lib/cache/auth.cache";
import { createServiceLogger } from "../../../lib/logger";
import {
	deleteAllUserSessions,
	deleteSessionById,
	findSessionByToken,
} from "../repositories/revoke.auth.repository";
import type {
	RevokeTokenInput,
	RevokeTokenOutput,
} from "../validations/revoke.auth.validation";

const logger = createServiceLogger("revokeAuth");

/**
 * Revoke an access or refresh token
 */
export async function revokeTokenService({
	data,
	userId,
}: {
	data: RevokeTokenInput;
	userId?: string;
}): Promise<RevokeTokenOutput> {
	const { token, token_type_hint } = data;

	logger.info({ token_type_hint }, "Token revocation requested");

	// Find the session associated with this token
	const session = await findSessionByToken({ token });

	if (!session) {
		// Token not found - could already be revoked or never existed
		// According to OAuth2 spec, this should still return success
		logger.debug("Token not found, may already be revoked");
		return { revoked: true };
	}

	const sessionUserId = String(session.userId);

	// If userId is provided (from authenticated user), verify ownership
	// Users can only revoke their own tokens
	if (userId && sessionUserId !== userId) {
		logger.warn(
			{
				requestingUser: userId,
				tokenOwner: sessionUserId,
			},
			"Attempted to revoke another user's token",
		);
		// Still return success per OAuth2 spec to not leak information
		return { revoked: true };
	}

	// Revoke the token
	if (token_type_hint === "refresh_token") {
		// Revoking refresh token invalidates ALL sessions for the user
		logger.info(
			{ userId: sessionUserId },
			"Revoking refresh token and all sessions",
		);

		// Delete all sessions from database
		await deleteAllUserSessions({ userId: sessionUserId });

		// Invalidate all cached sessions
		await invalidateAllUserSessions({ userId: sessionUserId });

		// Mark the token as revoked in cache
		await revokeToken({ token });
	} else {
		// Revoking access token only invalidates that specific session
		logger.info("Revoking access token");

		// Delete session from database
		await deleteSessionById({ sessionId: String(session._id) });

		// Invalidate cached session
		await invalidateSession({ sessionId: token });

		// Mark the token as revoked in cache
		await revokeToken({ token });
	}

	logger.info("Token revoked successfully");

	return { revoked: true };
}
