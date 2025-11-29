import type { Request, Response } from "express";
import { UnauthorizedError } from "../../../errors";
import {
	createControllerLogger,
	logInput,
	logSuccess,
} from "../../../lib/logger";
import { createUserService } from "../services/create.users.service";
import type { CreateUserInput } from "../validations/create.users.validation";

const logger = createControllerLogger("createUser");

export async function createUserController(req: Request, res: Response) {
	const startTime = Date.now();

	logInput(
		logger,
		{ ...req.body, password: "[REDACTED]" },
		"Create user request received",
	);

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	const data = req.body as CreateUserInput;

	const result = await createUserService({
		tenantId: user.tenantId,
		data,
		userRoles: user.roles,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{
			userId: result.id,
			email: result.email,
		},
		"User created successfully",
		duration,
	);

	res.status(201).json(result);
}
