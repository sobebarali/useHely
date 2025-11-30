import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { getEventController } from "./controllers/get-event.security.controller";
import { getKeyStatusController } from "./controllers/get-key-status.security.controller";
import { listEventsController } from "./controllers/list-events.security.controller";
import { rotateKeysController } from "./controllers/rotate-keys.security.controller";
import { getEventParamsSchema } from "./validations/get-event.security.validation";
import { listEventsQuerySchema } from "./validations/list-events.security.validation";

const router = Router();

// GET /api/security/keys/status - Get current encryption key status
// Authentication and SECURITY:READ permission required
// Returns current key ID, rotation history, and recommendations
router.get(
	"/keys/status",
	authenticate,
	authorize("SECURITY:READ"),
	getKeyStatusController,
);

// POST /api/security/keys/rotate - Rotate encryption master key
// Authentication and SECURITY:MANAGE permission required
// Re-encrypts all data with new key and creates audit record
// WARNING: Requires manual .env update and server restart after completion
router.post(
	"/keys/rotate",
	authenticate,
	authorize("SECURITY:MANAGE"),
	rotateKeysController,
);

// GET /api/security/events - List security events
// Authentication and SECURITY:READ permission required
// Supports filtering by severity, type, user, tenant, and date range
// Returns paginated results sorted by timestamp (most recent first)
router.get(
	"/events",
	authenticate,
	authorize("SECURITY:READ"),
	validate(listEventsQuerySchema),
	listEventsController,
);

// GET /api/security/events/:id - Get a specific security event by ID
// Authentication and SECURITY:READ permission required
// Returns full details of a single security event
router.get(
	"/events/:id",
	authenticate,
	authorize("SECURITY:READ"),
	validate(getEventParamsSchema),
	getEventController,
);

export default router;
