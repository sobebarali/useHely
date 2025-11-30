/**
 * Reports routes
 *
 * Route definitions for reports endpoints
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";

// Controllers
import { downloadReportController } from "./controllers/download.reports.controller";
import { generateReportController } from "./controllers/generate.reports.controller";
import { historyReportsController } from "./controllers/history.reports.controller";
import { listReportsController } from "./controllers/list.reports.controller";

// Validations
import { downloadReportSchema } from "./validations/download.reports.validation";
import { generateReportSchema } from "./validations/generate.reports.validation";
import { historyReportsSchema } from "./validations/history.reports.validation";
import { listReportsSchema } from "./validations/list.reports.validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/reports - List available report types
router.get(
	"/",
	authorize("REPORT:READ"),
	validate(listReportsSchema),
	listReportsController,
);

// POST /api/reports/generate - Generate a new report
router.post(
	"/generate",
	authorize("REPORT:CREATE"),
	validate(generateReportSchema),
	generateReportController,
);

// GET /api/reports/history - Get report generation history
router.get(
	"/history",
	authorize("REPORT:READ"),
	validate(historyReportsSchema),
	historyReportsController,
);

// GET /api/reports/:reportId/download - Download a generated report
router.get(
	"/:reportId/download",
	authorize("REPORT:READ"),
	validate(downloadReportSchema),
	downloadReportController,
);

export default router;
