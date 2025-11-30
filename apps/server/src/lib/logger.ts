import pino from "pino";
import { getTenantId, getTraceId, getUserId } from "./async-context";

// Sensitive fields that should be redacted
const SENSITIVE_FIELDS = [
	"password",
	"token",
	"accessToken",
	"refreshToken",
	"verificationToken",
	"resetToken",
	"secret",
	"apiKey",
	"creditCard",
	"cvv",
	"ssn",
];

// Fields that should be partially masked
const MASK_FIELDS = ["email", "phone", "adminEmail", "contactEmail"];

/**
 * Sanitize an object by redacting sensitive fields
 * Handles circular references by tracking seen objects
 */
function sanitizeObject(obj: unknown, seen = new WeakSet<object>()): unknown {
	if (!obj || typeof obj !== "object") {
		return obj;
	}

	// Handle circular references
	if (seen.has(obj as object)) {
		return "[Circular]";
	}
	seen.add(obj as object);

	if (Array.isArray(obj)) {
		return obj.map((item) => sanitizeObject(item, seen));
	}

	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(obj)) {
		const lowerKey = key.toLowerCase();

		// Redact sensitive fields completely
		if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
			sanitized[key] = "[REDACTED]";
			continue;
		}

		// Mask email addresses
		if (
			MASK_FIELDS.includes(key) &&
			typeof value === "string" &&
			value.includes("@")
		) {
			const [, domain] = value.split("@");
			sanitized[key] = `****@${domain}`;
			continue;
		}

		// Mask phone numbers (show last 4 digits)
		if (
			MASK_FIELDS.includes(key) &&
			typeof value === "string" &&
			value.length > 4
		) {
			sanitized[key] = `****${value.slice(-4)}`;
			continue;
		}

		// Recursively sanitize nested objects
		if (value && typeof value === "object") {
			sanitized[key] = sanitizeObject(value, seen);
		} else {
			sanitized[key] = value;
		}
	}

	return sanitized;
}

/**
 * Create base logger configuration
 */
const isDevelopment = process.env.NODE_ENV !== "production";
const isTest = process.env.NODE_ENV === "test";

const baseLogger = pino({
	level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
	// Pretty print in development, JSON in production
	transport:
		isDevelopment && !isTest
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "HH:MM:ss Z",
						ignore: "pid,hostname",
					},
				}
			: undefined,
	// Disable logging in test environment to reduce noise
	enabled: !isTest,
	// Mixin to inject context on every log call
	mixin() {
		return {
			traceId: getTraceId(),
			tenantId: getTenantId(),
			userId: getUserId(),
		};
	},
	// Custom serializers
	serializers: {
		err: pino.stdSerializers.err,
		req: pino.stdSerializers.req,
		res: pino.stdSerializers.res,
	},
});

/**
 * Create a child logger with metadata
 * Context (traceId, tenantId, userId) is injected via mixin on every log call
 */
export function createLogger(metadata?: Record<string, unknown>) {
	return baseLogger.child({
		...metadata,
	});
}

/**
 * Layer-specific logger factories
 */
export function createControllerLogger(operation: string) {
	return createLogger({ layer: "controller", operation });
}

export function createServiceLogger(operation: string) {
	return createLogger({ layer: "service", operation });
}

export function createRepositoryLogger(operation: string) {
	return createLogger({ layer: "repository", operation });
}

export function createMiddlewareLogger(name: string) {
	return createLogger({ layer: "middleware", name });
}

/**
 * Sanitize and log input payload
 */
export function logInput(
	logger: pino.Logger,
	input: unknown,
	message = "Input received",
) {
	logger.info({ input: sanitizeObject(input) }, message);
}

/**
 * Log successful operation with result
 */
export function logSuccess(
	logger: pino.Logger,
	result: unknown,
	message: string,
	duration?: number,
) {
	logger.info(
		{
			...(duration !== undefined && { duration }),
			result: sanitizeObject(result),
		},
		message,
	);
}

/**
 * Log error with full context
 */
export function logError(
	logger: pino.Logger,
	error: unknown,
	message: string,
	context?: Record<string, unknown>,
) {
	const errorInfo: Record<string, unknown> = {
		...context,
	};

	if (error instanceof Error) {
		errorInfo.error = {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
		// Add any additional properties from the error
		const errorObj = error as Error & Record<string, unknown>;
		for (const key in errorObj) {
			if (
				key !== "name" &&
				key !== "message" &&
				key !== "stack" &&
				Object.hasOwn(errorObj, key)
			) {
				(errorInfo.error as Record<string, unknown>)[key] = errorObj[key];
			}
		}
	} else {
		errorInfo.error = error;
	}

	logger.error(errorInfo, message);
}

/**
 * Log database operation
 */
export function logDatabaseOperation(
	logger: pino.Logger,
	operation: string,
	collection: string,
	query?: unknown,
	result?: unknown,
) {
	const logData: Record<string, unknown> = {
		dbOperation: operation,
		collection,
	};

	if (query) {
		logData.query = sanitizeObject(query);
	}

	if (result) {
		logData.result = sanitizeObject(result);
	}

	logger.debug(logData, `Database ${operation} on ${collection}`);
}

// Export default logger
export const logger = createLogger();

// Export sanitization utility for external use
export { sanitizeObject };
