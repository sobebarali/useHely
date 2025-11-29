import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../../errors";
import { createControllerLogger, logSuccess } from "../../../lib/logger";
import { getUserByIdService } from "../services/get-by-id.users.service";

const logger = createControllerLogger("getUserById");

export async function getUserByIdController(req: Request, res: Response) {
	const startTime = Date.now();

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	const { id } = req.params;
	if (!id) {
		throw new BadRequestError("User ID is required");
	}

	const result = await getUserByIdService({
		tenantId: user.tenantId,
		userId: id,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{
			userId: result.id,
		},
		"User retrieved successfully",
		duration,
	);

	res.status(200).json(result);
}
