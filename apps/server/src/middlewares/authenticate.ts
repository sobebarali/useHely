import { Session, Staff, User } from "@hms/db";
import type { NextFunction, Request, Response } from "express";
import { updateContext } from "../lib/async-context";
import { getCachedSession, isTokenRevoked } from "../lib/cache/auth.cache";
import { createMiddlewareLogger } from "../lib/logger";

const logger = createMiddlewareLogger("authenticate");

// Extended request interface with auth info
declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				email: string;
				name: string;
				tenantId: string;
				staffId?: string;
				roles: string[];
				permissions: string[];
				attributes?: {
					department?: string;
					specialization?: string;
					shift?: string;
				};
			};
		}
	}
}

/**
 * Authentication middleware
 * Validates session token and populates req.user with user information
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
	return authenticateAsync(req, res, next).catch(next);
}

async function authenticateAsync(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const authHeader = req.headers.authorization;

	if (!authHeader) {
		logger.debug("No authorization header provided");
		return res.status(401).json({
			code: "UNAUTHORIZED",
			message: "No authorization token provided",
		});
	}

	// Support both "Bearer <token>" and direct token
	const token = authHeader.startsWith("Bearer ")
		? authHeader.slice(7)
		: authHeader;

	if (!token) {
		logger.debug("Empty authorization token");
		return res.status(401).json({
			code: "UNAUTHORIZED",
			message: "Invalid authorization token format",
		});
	}

	try {
		// Check if token is revoked (fail closed if Redis is unavailable)
		try {
			const revoked = await isTokenRevoked({ token });
			if (revoked) {
				logger.debug("Token has been revoked");
				return res.status(401).json({
					code: "INVALID_TOKEN",
					message: "Token has been revoked",
				});
			}
		} catch (cacheError) {
			// Fail closed: For HIPAA-compliant systems, we cannot allow potentially
			// revoked tokens to be used when we can't verify revocation status
			logger.error(
				{ error: cacheError },
				"Failed to check token revocation, denying access for security",
			);
			return res.status(503).json({
				code: "SERVICE_UNAVAILABLE",
				message: "Authentication service temporarily unavailable",
			});
		}

		// Try to get session from cache first
		let cachedSession: Awaited<ReturnType<typeof getCachedSession>> = null;
		try {
			cachedSession = await getCachedSession({ sessionId: token });
		} catch (cacheError) {
			logger.warn(
				{ error: cacheError },
				"Failed to get cached session, falling back to database",
			);
		}

		if (cachedSession) {
			// Use cached session data
			req.user = {
				id: cachedSession.userId,
				email: "", // Not cached, can be fetched if needed
				name: "",
				tenantId: cachedSession.tenantId,
				roles: cachedSession.roles,
				permissions: cachedSession.permissions,
			};

			// Update request context
			updateContext({
				userId: cachedSession.userId,
				tenantId: cachedSession.tenantId,
			});

			logger.debug(
				{
					userId: cachedSession.userId,
					tenantId: cachedSession.tenantId,
				},
				"Authenticated from cache",
			);

			return next();
		}

		// Look up session in database
		const session = await Session.findOne({
			token,
			expiresAt: { $gt: new Date() },
		});

		if (!session) {
			logger.debug("Session not found or expired");
			return res.status(401).json({
				code: "TOKEN_EXPIRED",
				message: "Session not found or has expired",
			});
		}

		// Get user
		const user = await User.findById(session.userId);

		if (!user) {
			logger.warn(
				{ sessionUserId: session.userId },
				"User not found for session",
			);
			return res.status(401).json({
				code: "UNAUTHORIZED",
				message: "User not found",
			});
		}

		// Get staff record to find tenant and roles
		const staff = await Staff.findOne({ userId: user._id }).populate("roles");

		if (!staff) {
			// User exists but not associated with any tenant as staff
			// This might be a super admin or unassigned user
			logger.debug({ userId: user._id }, "No staff record found for user");

			req.user = {
				id: String(user._id),
				email: user.email,
				name: user.name,
				tenantId: "", // No tenant
				roles: [],
				permissions: [],
			};

			updateContext({
				userId: String(user._id),
			});

			return next();
		}

		// Extract role names and permissions from populated roles
		const roles: string[] = [];
		const permissions: string[] = [];

		if (staff.roles && Array.isArray(staff.roles)) {
			for (const role of staff.roles) {
				if (typeof role === "object" && role !== null) {
					// Populated role object
					const roleObj = role as {
						name?: string;
						permissions?: string[];
					};
					if (roleObj.name) {
						roles.push(roleObj.name);
					}
					if (roleObj.permissions) {
						permissions.push(...roleObj.permissions);
					}
				} else if (typeof role === "string") {
					// Just the role ID
					roles.push(role);
				}
			}
		}

		// Deduplicate permissions
		const uniquePermissions = [...new Set(permissions)];

		// Build user object
		req.user = {
			id: String(user._id),
			email: user.email,
			name: user.name,
			tenantId: String(staff.tenantId),
			staffId: String(staff._id),
			roles,
			permissions: uniquePermissions,
			attributes: {
				department: staff.departmentId ? String(staff.departmentId) : undefined,
				specialization: staff.specialization || undefined,
				shift: staff.shift || undefined,
			},
		};

		// Update request context
		updateContext({
			userId: String(user._id),
			tenantId: String(staff.tenantId),
		});

		logger.debug(
			{
				userId: user._id,
				tenantId: staff.tenantId,
				roles,
			},
			"User authenticated successfully",
		);

		next();
	} catch (error) {
		logger.error({ error }, "Authentication error");
		return res.status(500).json({
			code: "INTERNAL_ERROR",
			message: "Authentication failed due to internal error",
		});
	}
}

/**
 * Optional authentication middleware
 * Populates req.user if valid token provided, but doesn't reject unauthenticated requests
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;

	if (!authHeader) {
		return next();
	}

	return authenticate(req, res, next);
}
