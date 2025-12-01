/**
 * Compliance Routes
 *
 * Defines all GDPR compliance API endpoints with authentication,
 * authorization, and validation middleware.
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import {
	complianceDeletionRateLimiter,
	complianceVerificationRateLimiter,
} from "../../middlewares/rate-limit";
import { validate } from "../../middlewares/validate";
import { cancelDeletionController } from "./controllers/cancel-deletion.compliance.controller";
import { downloadExportController } from "./controllers/download-export.compliance.controller";
import { getConsentHistoryController } from "./controllers/get-consent-history.compliance.controller";
import { getDeletionStatusController } from "./controllers/get-deletion-status.compliance.controller";
import { getExportStatusController } from "./controllers/get-export-status.compliance.controller";
// Consent Controllers
import { listConsentController } from "./controllers/list-consent.compliance.controller";
// Admin Controllers
import { listRequestsController } from "./controllers/list-requests.compliance.controller";
import { processRequestController } from "./controllers/process-request.compliance.controller";
import { recordConsentController } from "./controllers/record-consent.compliance.controller";
// Data Deletion Controllers
import { requestDeletionController } from "./controllers/request-deletion.compliance.controller";
// Data Export Controllers
import { requestExportController } from "./controllers/request-export.compliance.controller";
import { verifyDeletionController } from "./controllers/verify-deletion.compliance.controller";
import { withdrawConsentController } from "./controllers/withdraw-consent.compliance.controller";
import { cancelDeletionSchema } from "./validations/cancel-deletion.compliance.validation";
import { getConsentHistorySchema } from "./validations/get-consent-history.compliance.validation";
import { getDeletionStatusSchema } from "./validations/get-deletion-status.compliance.validation";
import { getExportStatusSchema } from "./validations/get-export-status.compliance.validation";
// Consent Validations
import { listConsentSchema } from "./validations/list-consent.compliance.validation";
// Admin Validations
import { listRequestsSchema } from "./validations/list-requests.compliance.validation";
import { processRequestSchema } from "./validations/process-request.compliance.validation";
import { recordConsentSchema } from "./validations/record-consent.compliance.validation";
// Data Deletion Validations
import { requestDeletionSchema } from "./validations/request-deletion.compliance.validation";
// Data Export Validations
import { requestExportSchema } from "./validations/request-export.compliance.validation";
import { verifyDeletionSchema } from "./validations/verify-deletion.compliance.validation";
import { withdrawConsentSchema } from "./validations/withdraw-consent.compliance.validation";

const router = Router();

// ============================================
// CONSENT MANAGEMENT ENDPOINTS
// ============================================

// GET /api/compliance/consent - Get all consent records for authenticated user
// Authentication required (no special permissions - own data)
router.get(
	"/consent",
	authenticate,
	validate(listConsentSchema),
	listConsentController,
);

// POST /api/compliance/consent - Record new consent or update existing
// Authentication required (no special permissions - own data)
router.post(
	"/consent",
	authenticate,
	validate(recordConsentSchema),
	recordConsentController,
);

// PUT /api/compliance/consent/:id/withdraw - Withdraw consent
// Authentication required (no special permissions - own data)
router.put(
	"/consent/:id/withdraw",
	authenticate,
	validate(withdrawConsentSchema),
	withdrawConsentController,
);

// GET /api/compliance/consent/:purpose/history - Get consent history for purpose
// Authentication required (no special permissions - own data)
router.get(
	"/consent/:purpose/history",
	authenticate,
	validate(getConsentHistorySchema),
	getConsentHistoryController,
);

// ============================================
// DATA EXPORT ENDPOINTS (Right of Access)
// ============================================

// POST /api/compliance/data-export - Request data export
// Authentication required (no special permissions - own data)
// Returns 202 Accepted
router.post(
	"/data-export",
	authenticate,
	validate(requestExportSchema),
	requestExportController,
);

// GET /api/compliance/data-export/:requestId - Check export status
// Authentication required (no special permissions - own data)
router.get(
	"/data-export/:requestId",
	authenticate,
	validate(getExportStatusSchema),
	getExportStatusController,
);

// GET /api/compliance/data-export/:requestId/download - Download export file
// Authentication required (no special permissions - own data)
router.get(
	"/data-export/:requestId/download",
	authenticate,
	validate(getExportStatusSchema), // Reuses same param validation
	downloadExportController,
);

// ============================================
// DATA DELETION ENDPOINTS (Right to Erasure)
// ============================================

// POST /api/compliance/data-deletion - Request data deletion
// Authentication required (no special permissions - own data)
// Rate limited: 3 requests per day
// Returns 202 Accepted
router.post(
	"/data-deletion",
	authenticate,
	complianceDeletionRateLimiter,
	validate(requestDeletionSchema),
	requestDeletionController,
);

// POST /api/compliance/data-deletion/:requestId/verify - Verify deletion request
// Authentication required (no special permissions - own data)
// Rate limited: 5 attempts per hour
router.post(
	"/data-deletion/:requestId/verify",
	authenticate,
	complianceVerificationRateLimiter,
	validate(verifyDeletionSchema),
	verifyDeletionController,
);

// POST /api/compliance/data-deletion/:requestId/cancel - Cancel deletion request
// Authentication required (no special permissions - own data)
router.post(
	"/data-deletion/:requestId/cancel",
	authenticate,
	validate(cancelDeletionSchema),
	cancelDeletionController,
);

// GET /api/compliance/data-deletion/:requestId - Get deletion status
// Authentication required (no special permissions - own data)
router.get(
	"/data-deletion/:requestId",
	authenticate,
	validate(getDeletionStatusSchema),
	getDeletionStatusController,
);

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/compliance/requests - List all data subject requests (admin)
// Authentication and COMPLIANCE:READ permission required
router.get(
	"/requests",
	authenticate,
	authorize("COMPLIANCE:READ"),
	validate(listRequestsSchema),
	listRequestsController,
);

// PUT /api/compliance/requests/:requestId/process - Process data request (admin)
// Authentication and COMPLIANCE:MANAGE permission required
router.put(
	"/requests/:requestId/process",
	authenticate,
	authorize("COMPLIANCE:MANAGE"),
	validate(processRequestSchema),
	processRequestController,
);

export default router;
