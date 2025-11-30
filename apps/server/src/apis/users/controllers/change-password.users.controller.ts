import type { Request, Response } from "express";
import { UnauthorizedError } from "../../../errors";
import { createControllerLogger, logSuccess } from "../../../lib/logger";
import { changePasswordService } from "../services/change-password.users.service";
import type { ChangePasswordInput } from "../validations/change-password.users.validation";

const logger = createControllerLogger("changePassword");

export async function changePasswordController(req: Request, res: Response) {
	const startTime = Date.now();

	const { user } = req;
	if (!user?.id) {
		throw new UnauthorizedError("Authentication required");
	}

	logger.info({ userId: user.id }, "Change password request received");

	const data = req.body as ChangePasswordInput;

	const result = await changePasswordService({
		userId: user.id,
		data,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{ userId: user.id },
		"Password changed successfully",
		duration,
	);

	res.status(200).json(result);
}
