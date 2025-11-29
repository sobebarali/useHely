import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../../errors";
import { createControllerLogger, logSuccess } from "../../../lib/logger";
import { forcePasswordChangeService } from "../services/force-password-change.users.service";

const logger = createControllerLogger("forcePasswordChange");

export async function forcePasswordChangeController(
	req: Request,
	res: Response,
) {
	const startTime = Date.now();

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	const { id } = req.params;
	if (!id) {
		throw new BadRequestError("User ID is required");
	}

	const result = await forcePasswordChangeService({
		tenantId: user.tenantId,
		userId: id,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{
			userId: result.id,
		},
		"Password change forced successfully",
		duration,
	);

	res.status(200).json(result);
}
