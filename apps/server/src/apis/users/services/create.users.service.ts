import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
} from "../../../errors";
import { createServiceLogger } from "../../../lib/logger";
import {
	enqueueLinkedUserEmail,
	enqueueWelcomeEmail,
} from "../../../lib/queue";
import { generateTemporaryPassword, hashPassword } from "../../../utils/crypto";
import { findHospitalById } from "../../hospital/repositories/shared.hospital.repository";
import {
	createUser,
	linkExistingUserToTenant,
} from "../repositories/create.users.repository";
import {
	findDepartmentById,
	findStaffByEmail,
	findUserByEmail,
	getNextEmployeeSequence,
	getRolesByIds,
} from "../repositories/shared.users.repository";
import type {
	CreateUserInput,
	CreateUserOutput,
} from "../validations/create.users.validation";

const logger = createServiceLogger("createUser");

/**
 * Create a new user within the hospital tenant.
 * If the user already exists in the system (another tenant), links them to this tenant.
 * If the user already exists in this tenant, returns a conflict error.
 */
export async function createUserService({
	tenantId,
	data,
	userRoles,
}: {
	tenantId: string;
	data: CreateUserInput;
	userRoles: string[];
}): Promise<CreateUserOutput> {
	const { firstName, lastName, department, roles } = data;
	// Normalize email to lowercase to prevent case-sensitive duplicates
	const email = data.email.toLowerCase();

	logger.info({ tenantId, email }, "Creating new user");

	// Check if email already exists within this tenant (already a staff member)
	const existingStaff = await findStaffByEmail({ tenantId, email });
	if (existingStaff) {
		logger.warn({ tenantId, email }, "Email already exists in tenant");
		throw new ConflictError(
			"Email already in use within this organization",
			"EMAIL_EXISTS",
		);
	}

	// Check if user exists globally (in another tenant)
	const existingUser = await findUserByEmail({ email });
	const isLinkingExistingUser = !!existingUser;

	if (isLinkingExistingUser) {
		logger.info(
			{ tenantId, email, existingUserId: existingUser._id },
			"User exists in system - will link to this tenant",
		);
	}

	// Verify hospital exists and get slug for username
	const hospital = await findHospitalById({ hospitalId: tenantId });
	if (!hospital) {
		logger.error({ tenantId }, "Hospital not found");
		throw new BadRequestError("Invalid organization", "INVALID_REQUEST");
	}

	// Verify department exists
	const departmentRecord = await findDepartmentById({
		tenantId,
		departmentId: department,
	});
	if (!departmentRecord) {
		logger.warn({ tenantId, department }, "Department not found");
		throw new BadRequestError("Invalid department", "INVALID_REQUEST");
	}

	// Verify all roles exist and belong to tenant
	const roleRecords = await getRolesByIds({ tenantId, roleIds: roles });
	if (roleRecords.length !== roles.length) {
		const foundRoleIds = roleRecords.map((r) => String(r._id));
		const invalidRoles = roles.filter((id) => !foundRoleIds.includes(id));
		logger.warn({ tenantId, invalidRoles }, "Invalid role IDs");
		throw new BadRequestError(
			"One or more role IDs are invalid",
			"INVALID_ROLE",
		);
	}

	// Check that user cannot assign roles higher than their own
	// This is simplified - in production you'd check the role hierarchy
	const isAdmin =
		userRoles.includes("HOSPITAL_ADMIN") || userRoles.includes("SUPER_ADMIN");
	if (!isAdmin) {
		const systemRoles = roleRecords.filter((r) => r.isSystem);
		if (systemRoles.length > 0) {
			logger.warn(
				{ tenantId, userRoles },
				"Non-admin trying to assign system roles",
			);
			throw new ForbiddenError("You cannot assign system roles", "FORBIDDEN");
		}
	}

	// Generate username
	const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${hospital.slug}`;

	// Generate employee ID using atomic counter (prevents race conditions)
	const seq = await getNextEmployeeSequence({ tenantId });
	const employeeId = `EMP-${String(seq).padStart(5, "0")}`;

	let staff: {
		_id: unknown;
		firstName: string;
		lastName: string;
		departmentId?: unknown;
		status?: string;
	};

	if (isLinkingExistingUser) {
		// Link existing user to this tenant (create only Staff record)
		const result = await linkExistingUserToTenant({
			tenantId,
			data: {
				userId: String(existingUser._id),
				firstName,
				lastName,
				phone: data.phone,
				department,
				roles,
				specialization: data.specialization,
				shift: data.shift,
			},
			employeeId,
		});
		staff = result.staff;

		// Queue notification email for linked user (no password - use existing credentials)
		enqueueLinkedUserEmail({
			to: email,
			name: firstName,
			linkedByName: hospital.name,
			hospitalName: hospital.name,
			temporaryPassword: "", // Not used for linked users
			loginUrl: process.env.CORS_ORIGIN || "",
		}).catch((error) => {
			logger.error({ error }, "Failed to queue linked user email");
		});

		logger.info(
			{
				staffId: staff._id,
				tenantId,
				email,
				linkedUser: true,
			},
			"Existing user linked to tenant successfully",
		);

		return {
			id: String(staff._id),
			username,
			email,
			firstName: staff.firstName,
			lastName: staff.lastName,
			department: String(staff.departmentId),
			roles: roleRecords.map((r) => ({
				id: String(r._id),
				name: r.name,
			})),
			status: staff.status || "ACTIVE",
			message:
				"User linked to organization. They can login with their existing credentials.",
		};
	}

	// Create new user (User + Account + Staff records)
	const temporaryPassword = generateTemporaryPassword();
	const hashedPassword = await hashPassword(temporaryPassword);

	// Pass normalized email to ensure consistency
	const result = await createUser({
		tenantId,
		data: { ...data, email },
		hashedPassword,
		employeeId,
	});
	staff = result.staff;

	// Queue welcome email with temporary credentials
	enqueueWelcomeEmail({
		to: email,
		name: firstName,
		temporaryPassword,
		hospitalName: hospital.name,
		loginUrl: process.env.CORS_ORIGIN || "",
	}).catch((error) => {
		logger.error({ error }, "Failed to queue welcome email");
	});

	logger.info(
		{
			staffId: staff._id,
			tenantId,
			email,
		},
		"User created successfully",
	);

	return {
		id: String(staff._id),
		username,
		email,
		firstName: staff.firstName,
		lastName: staff.lastName,
		department: String(staff.departmentId),
		roles: roleRecords.map((r) => ({
			id: String(r._id),
			name: r.name,
		})),
		status: staff.status || "ACTIVE",
		message: "Welcome email queued with temporary credentials",
	};
}
