/**
 * Audit Log Routes
 *
 * Defines all audit log API endpoints with authentication,
 * authorization, and validation middleware.
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { exportController } from "./controllers/export.audit.controller";
import { exportStatusController } from "./controllers/export-status.audit.controller";
import { getLogController } from "./controllers/get-log.audit.controller";
import { hipaaReportController } from "./controllers/hipaa-report.audit.controller";
// Controllers
import { listLogsController } from "./controllers/list-logs.audit.controller";
import { phiAccessReportController } from "./controllers/phi-access-report.audit.controller";
import { resourceTrailController } from "./controllers/resource-trail.audit.controller";
import { userTrailController } from "./controllers/user-trail.audit.controller";
import { verifyController } from "./controllers/verify.audit.controller";
import { exportSchema } from "./validations/export.audit.validation";
import { exportStatusSchema } from "./validations/export-status.audit.validation";
import { getLogParamsSchema } from "./validations/get-log.audit.validation";
import { hipaaReportSchema } from "./validations/hipaa-report.audit.validation";
// Validations
import { listLogsQuerySchema } from "./validations/list-logs.audit.validation";
import { phiAccessReportSchema } from "./validations/phi-access-report.audit.validation";
import { resourceTrailSchema } from "./validations/resource-trail.audit.validation";
import { userTrailSchema } from "./validations/user-trail.audit.validation";
import { verifySchema } from "./validations/verify.audit.validation";

const router = Router();

// GET /api/audit/logs - List audit logs with filtering and pagination
// Authentication and AUDIT:READ permission required
router.get(
	"/logs",
	authenticate,
	authorize("AUDIT:READ"),
	validate(listLogsQuerySchema),
	listLogsController,
);

// GET /api/audit/logs/:id - Get a specific audit log entry
// Authentication and AUDIT:READ permission required
router.get(
	"/logs/:id",
	authenticate,
	authorize("AUDIT:READ"),
	validate(getLogParamsSchema),
	getLogController,
);

// GET /api/audit/users/:userId/trail - Get user's audit trail
// Authentication and AUDIT:READ permission required
router.get(
	"/users/:userId/trail",
	authenticate,
	authorize("AUDIT:READ"),
	validate(userTrailSchema),
	userTrailController,
);

// GET /api/audit/resources/:resourceType/:resourceId/trail - Get resource audit trail
// Authentication and AUDIT:READ permission required
router.get(
	"/resources/:resourceType/:resourceId/trail",
	authenticate,
	authorize("AUDIT:READ"),
	validate(resourceTrailSchema),
	resourceTrailController,
);

// GET /api/audit/reports/hipaa - Generate HIPAA compliance report
// Authentication and AUDIT:REPORT permission required
router.get(
	"/reports/hipaa",
	authenticate,
	authorize("AUDIT:REPORT"),
	validate(hipaaReportSchema),
	hipaaReportController,
);

// GET /api/audit/reports/phi-access - Generate PHI access report
// Authentication and AUDIT:REPORT permission required
router.get(
	"/reports/phi-access",
	authenticate,
	authorize("AUDIT:REPORT"),
	validate(phiAccessReportSchema),
	phiAccessReportController,
);

// POST /api/audit/export - Export audit logs
// Authentication and AUDIT:EXPORT permission required
// Returns 202 Accepted as export is processed asynchronously
router.post(
	"/export",
	authenticate,
	authorize("AUDIT:EXPORT"),
	validate(exportSchema),
	exportController,
);

// GET /api/audit/export/:exportId - Get export job status
// Authentication and AUDIT:EXPORT permission required
router.get(
	"/export/:exportId",
	authenticate,
	authorize("AUDIT:EXPORT"),
	validate(exportStatusSchema),
	exportStatusController,
);

// POST /api/audit/verify - Verify audit log chain integrity
// Authentication and AUDIT:MANAGE permission required
router.post(
	"/verify",
	authenticate,
	authorize("AUDIT:MANAGE"),
	validate(verifySchema),
	verifyController,
);

export default router;
