/**
 * List Requests Controller
 *
 * Endpoint: GET /api/compliance/requests
 * Description: List all data subject requests (admin view)
 * Auth: Required with COMPLIANCE:READ permission
 */

import type { Response } from "express";
import { createControllerLogger, logInput, logSuccess } from "@/lib/logger";
import {
	type AuthenticatedRequest,
	authenticatedHandler,
} from "@/utils/async-handler";
import { listRequestsService } from "../services/list-requests.compliance.service";
import type { ListRequestsInput } from "../validations/list-requests.compliance.validation";

const logger = createControllerLogger("listRequests");

export const listRequestsController = authenticatedHandler(
	async (req: AuthenticatedRequest, res: Response) => {
		const startTime = Date.now();

		logInput(logger, req.query, "List data subject requests received");

		const query = req.query as unknown as ListRequestsInput;

		const result = await listRequestsService({
			tenantId: req.user.tenantId,
			type: query.type,
			status: query.status,
			startDate: query.startDate,
			endDate: query.endDate,
			page: query.page || 1,
			limit: query.limit || 20,
		});

		const duration = Date.now() - startTime;

		logSuccess(
			logger,
			{ count: result.data.length, total: result.pagination.total },
			"Data subject requests listed",
			duration,
		);

		res.status(200).json({
			success: true,
			...result,
		});
	},
);
