import type { NextFunction, Request, Response } from "express";

/**
 * Authenticated user type from authenticate middleware
 */
export interface AuthenticatedUser {
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
}

/**
 * Request type with guaranteed authenticated user
 * Use this in controllers that run after authenticate middleware
 */
export interface AuthenticatedRequest extends Request {
	user: AuthenticatedUser;
}

/**
 * Async handler wrapper for Express route handlers
 *
 * Wraps async controller functions to automatically catch errors
 * and pass them to Express error handling middleware.
 *
 * This eliminates the need for try-catch blocks in every controller.
 *
 * @example
 * ```typescript
 * // Before: Manual try-catch in every controller
 * export async function myController(req: Request, res: Response) {
 *   try {
 *     const result = await myService();
 *     res.json(result);
 *   } catch (error) {
 *     // 50 lines of error handling...
 *   }
 * }
 *
 * // After: Clean controller with asyncHandler
 * export const myController = asyncHandler(async (req, res) => {
 *   const result = await myService();
 *   res.json(result);
 * });
 * ```
 */
export function asyncHandler(
	fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
	return (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

/**
 * Async handler wrapper for authenticated routes
 *
 * Same as asyncHandler but with typed AuthenticatedRequest
 * for routes that run after authenticate middleware
 */
export function authenticatedHandler(
	fn: (
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction,
	) => Promise<unknown>,
) {
	return (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
	};
}
