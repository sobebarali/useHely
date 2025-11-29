import type { Request, Response } from "express";
import { UnauthorizedError } from "../../../errors";
import { createControllerLogger, logSuccess } from "../../../lib/logger";
import { listUsersService } from "../services/list.users.service";
import type { ListUsersInput } from "../validations/list.users.validation";

const logger = createControllerLogger("listUsers");

export async function listUsersController(req: Request, res: Response) {
	const startTime = Date.now();

	const { user } = req;
	if (!user?.tenantId) {
		throw new UnauthorizedError("Authentication required");
	}

	const query = req.query as unknown as ListUsersInput;

	const result = await listUsersService({
		tenantId: user.tenantId,
		query,
	});

	const duration = Date.now() - startTime;

	logSuccess(
		logger,
		{
			count: result.data.length,
			total: result.pagination.total,
		},
		"Users listed successfully",
		duration,
	);

	res.status(200).json(result);
}
