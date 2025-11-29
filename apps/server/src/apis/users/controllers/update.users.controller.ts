import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../../errors";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { updateUserService } from "../services/update.users.service";
import type { UpdateUserInput } from "../validations/update.users.validation";

const logger = createControllerLogger("updateUser");

export async function updateUserController(req: Request, res: Response) {
	const startTime = Date.now();

	logInput(logger, req.body, "Update user request received");

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	const { id } = req.params;
	if (!id) {
		throw new BadRequestError("User ID is required");
	}

	const data = req.body as UpdateUserInput;

	const result = await updateUserService({
		tenantId: user.tenantId,
		userId: id,
		data,
		requesterId: user.id,
		requesterRoles: user.roles,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{
			userId: result.id,
		},
		"User updated successfully",
		duration,
	);

	res.status(200).json(result);
}
