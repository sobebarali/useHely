import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../../errors";
import { createControllerLogger, logSuccess } from "../../../lib/logger";
import { deactivateUserService } from "../services/deactivate.users.service";

const logger = createControllerLogger("deactivateUser");

export async function deactivateUserController(req: Request, res: Response) {
	const startTime = Date.now();

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	const { id } = req.params;
	if (!id) {
		throw new BadRequestError("User ID is required");
	}

	const result = await deactivateUserService({
		tenantId: user.tenantId,
		userId: id,
		requesterId: user.staffId || user.id,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{
			userId: result.id,
		},
		"User deactivated successfully",
		duration,
	);

	res.status(200).json(result);
}
