import { Account, Staff, User } from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import {
	createRepositoryLogger,
	logDatabaseOperation,
	logError,
} from "../../../lib/logger";
import type { CreateUserInput } from "../validations/create.users.validation";

const logger = createRepositoryLogger("createUser");

/**
 * Create a new user with associated account and staff record
 */
export async function createUser({
	tenantId,
	data,
	hashedPassword,
	employeeId,
}: {
	tenantId: string;
	data: CreateUserInput;
	hashedPassword: string;
	employeeId: string;
}) {
	try {
		const userId = uuidv4();
		const staffId = uuidv4();
		const accountId = uuidv4();

		logger.debug({ userId, tenantId }, "Creating user");

		// Create user record
		const user = await User.create({
			_id: userId,
			name: `${data.firstName} ${data.lastName}`,
			email: data.email,
			emailVerified: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"user",
			{ tenantId, email: data.email },
			{ _id: user._id },
		);

		// Create account record with password
		const account = await Account.create({
			_id: accountId,
			accountId: accountId,
			userId: userId,
			providerId: "credential",
			password: hashedPassword,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"account",
			{ userId },
			{ _id: account._id },
		);

		// Create staff record
		const staff = await Staff.create({
			_id: staffId,
			tenantId,
			userId,
			employeeId,
			firstName: data.firstName,
			lastName: data.lastName,
			phone: data.phone,
			departmentId: data.department,
			roles: data.roles,
			specialization: data.specialization,
			shift: data.shift,
			status: "ACTIVE",
			passwordHistory: [hashedPassword],
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		logDatabaseOperation(
			logger,
			"create",
			"staff",
			{ tenantId, userId },
			{ _id: staff._id },
		);

		logger.info({ userId, staffId, tenantId }, "User created successfully");

		return {
			user,
			staff,
			account,
		};
	} catch (error) {
		logError(logger, error, "Failed to create user", { tenantId });
		throw error;
	}
}
