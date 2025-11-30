/**
 * Rate limiting middleware
 *
 * Provides protection against brute-force attacks and DoS.
 * Uses express-rate-limit with configurable windows and limits.
 */

import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { RATE_LIMIT_CONFIG } from "../constants";
import { createMiddlewareLogger } from "../lib/logger";

const logger = createMiddlewareLogger("rateLimit");

/**
 * Normalize IP address for consistent rate limiting
 * Handles both IPv4 and IPv6 addresses
 */
function normalizeIp(req: Request): string {
	const ip = req.ip || req.socket.remoteAddress || "unknown";
	// Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.1)
	if (ip.startsWith("::ffff:")) {
		return ip.slice(7);
	}
	return ip;
}

/**
 * Rate limiter for authentication endpoints
 * Stricter limits to prevent brute-force attacks
 */
export const authRateLimiter = rateLimit({
	windowMs: RATE_LIMIT_CONFIG.AUTH.WINDOW_MS,
	max: RATE_LIMIT_CONFIG.AUTH.MAX_REQUESTS,
	standardHeaders: true,
	legacyHeaders: false,
	validate: { xForwardedForHeader: false },
	message: {
		code: "RATE_LIMIT_EXCEEDED",
		message: "Too many requests, please try again later",
	},
	keyGenerator: (req: Request): string => {
		// Use normalized IP + email (if available) for more granular limiting
		const email = req.body?.username || req.query?.email || "";
		const ip = normalizeIp(req);
		return `${ip}:${email}`;
	},
	handler: (req: Request, res: Response) => {
		logger.warn(
			{
				ip: req.ip,
				path: req.path,
			},
			"Rate limit exceeded on auth endpoint",
		);
		res.status(429).json({
			code: "RATE_LIMIT_EXCEEDED",
			message: "Too many authentication attempts, please try again later",
		});
	},
	skip: (_req: Request): boolean => {
		// Skip rate limiting in test environment
		return process.env.NODE_ENV === "test";
	},
});

/**
 * Rate limiter for general API endpoints
 * More lenient limits for regular API usage
 */
export const apiRateLimiter = rateLimit({
	windowMs: RATE_LIMIT_CONFIG.API.WINDOW_MS,
	max: RATE_LIMIT_CONFIG.API.MAX_REQUESTS,
	standardHeaders: true,
	legacyHeaders: false,
	validate: { xForwardedForHeader: false },
	message: {
		code: "RATE_LIMIT_EXCEEDED",
		message: "Too many requests, please try again later",
	},
	keyGenerator: (req: Request): string => {
		return normalizeIp(req);
	},
	handler: (req: Request, res: Response) => {
		logger.warn(
			{
				ip: req.ip,
				path: req.path,
			},
			"Rate limit exceeded",
		);
		res.status(429).json({
			code: "RATE_LIMIT_EXCEEDED",
			message: "Too many requests, please try again later",
		});
	},
	skip: (_req: Request): boolean => {
		// Skip rate limiting in test environment
		return process.env.NODE_ENV === "test";
	},
});

/**
 * Rate limiter for inventory stock modification endpoints
 * Moderate limits to prevent rapid stock manipulation while allowing normal operations
 * 30 requests per minute per user
 */
export const inventoryStockRateLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute window
	max: 30, // 30 stock modifications per minute
	standardHeaders: true,
	legacyHeaders: false,
	validate: { xForwardedForHeader: false },
	message: {
		code: "RATE_LIMIT_EXCEEDED",
		message: "Too many stock modification requests, please try again later",
	},
	keyGenerator: (req: Request): string => {
		// Use IP + user ID (from JWT) for per-user limiting
		const ip = normalizeIp(req);
		const userId = (req as Request & { user?: { id?: string } }).user?.id || "";
		return `inventory:${ip}:${userId}`;
	},
	handler: (req: Request, res: Response) => {
		logger.warn(
			{
				ip: req.ip,
				path: req.path,
				userId: (req as Request & { user?: { id?: string } }).user?.id,
			},
			"Rate limit exceeded on inventory stock modification",
		);
		res.status(429).json({
			code: "RATE_LIMIT_EXCEEDED",
			message: "Too many stock modification requests, please try again later",
		});
	},
	skip: (_req: Request): boolean => {
		// Skip rate limiting in test environment
		return process.env.NODE_ENV === "test";
	},
});
