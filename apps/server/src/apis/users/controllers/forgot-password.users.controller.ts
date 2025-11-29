import type { Request, Response } from "express";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { forgotPasswordService } from "../services/forgot-password.users.service";
import type { ForgotPasswordInput } from "../validations/forgot-password.users.validation";

const logger = createControllerLogger("forgotPassword");

export async function forgotPasswordController(req: Request, res: Response) {
	const startTime = Date.now();

	logInput(
		logger,
		{ email: `****@${req.body.email?.split("@")[1] || "***"}` },
		"Forgot password request received",
	);

	const data = req.body as ForgotPasswordInput;

	const result = await forgotPasswordService({ data });

	const duration = Date.now() - startTime;

	logSuccess(logger, {}, "Forgot password processed", duration);

	res.status(200).json(result);
}
