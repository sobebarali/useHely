import type { Request, Response } from "express";
import { createControllerLogger, logSuccess } from "../../../lib/logger";
import { resetPasswordService } from "../services/reset-password.users.service";
import type { ResetPasswordInput } from "../validations/reset-password.users.validation";

const logger = createControllerLogger("resetPassword");

export async function resetPasswordController(req: Request, res: Response) {
	const startTime = Date.now();

	logger.info("Reset password request received");

	const data = req.body as ResetPasswordInput;

	const result = await resetPasswordService({ data });

	const duration = Date.now() - startTime;

	logSuccess(logger, {}, "Password reset successfully", duration);

	res.status(200).json(result);
}
