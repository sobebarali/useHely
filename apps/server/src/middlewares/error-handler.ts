import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";
import { createMiddlewareLogger, logError } from "../lib/logger";

const logger = createMiddlewareLogger("error-handler");

/**
 * Global error handler middleware
 * This should be the last middleware in the chain
 *
 * Handles:
 * - AppError instances (operational errors with status, code, message)
 * - Legacy error objects with { status, code, message } shape
 * - Unexpected errors (logged and returned as 500)
 */
export function errorHandler(
	error: unknown,
	req: Request,
	res: Response,
	_next: NextFunction,
) {
	// Don't send response if headers already sent
	if (res.headersSent) {
		return;
	}

	// Handle AppError instances (typed application errors)
	if (AppError.isAppError(error)) {
		// Log operational errors at warn level, non-operational at error level
		if (error.isOperational) {
			logger.warn(
				{
					code: error.code,
					status: error.status,
					path: req.path,
					method: req.method,
				},
				error.message,
			);
		} else {
			logError(logger, error, "Non-operational error", {
				method: req.method,
				path: req.path,
			});
		}

		return res.status(error.status).json({
			...error.toJSON(),
			traceId: req.context?.traceId,
		});
	}

	// Handle legacy error objects with { status, code, message } shape
	if (
		error &&
		typeof error === "object" &&
		"status" in error &&
		"code" in error &&
		"message" in error
	) {
		const legacyError = error as {
			status: number;
			code: string;
			message: string;
		};

		logger.warn(
			{
				code: legacyError.code,
				status: legacyError.status,
				path: req.path,
				method: req.method,
			},
			legacyError.message,
		);

		return res.status(legacyError.status).json({
			code: legacyError.code,
			message: legacyError.message,
			traceId: req.context?.traceId,
		});
	}

	// Log unexpected errors with full context
	logError(logger, error, "Unhandled error in request", {
		method: req.method,
		path: req.path,
		query: req.query,
		body: req.body,
		ip: req.ip || req.socket.remoteAddress,
	});

	// Send generic error response for unexpected errors
	res.status(500).json({
		code: "INTERNAL_ERROR",
		message: "An unexpected error occurred",
		traceId: req.context?.traceId,
	});
}
