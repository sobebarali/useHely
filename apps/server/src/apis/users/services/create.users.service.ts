import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
} from "../../../errors";
import { getWelcomeEmailTemplate } from "../../../lib/email/templates/welcome";
import { createServiceLogger } from "../../../lib/logger";
import { sendEmail } from "../../../lib/mailer";
import { findHospitalById } from "../../hospital/repositories/shared.hospital.repository";
import { createUser } from "../repositories/create.users.repository";
import {
	findDepartmentById,
	findStaffByEmail,
	generateTemporaryPassword,
	getRolesByIds,
	hashPassword,
} from "../repositories/shared.users.repository";
import type {
	CreateUserInput,
	CreateUserOutput,
} from "../validations/create.users.validation";

const logger = createServiceLogger("createUser");

/**
 * Create a new user within the hospital tenant
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
	const { firstName, lastName, email, department, roles } = data;

	logger.info({ tenantId, email }, "Creating new user");

	// Check if email already exists within tenant
	const existingStaff = await findStaffByEmail({ tenantId, email });
	if (existingStaff) {
		logger.warn({ tenantId, email }, "Email already exists in tenant");
		throw new ConflictError(
			"Email already in use within this organization",
			"EMAIL_EXISTS",
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

	// Generate username and temporary password
	const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${hospital.slug}`;
	const temporaryPassword = generateTemporaryPassword();
	const hashedPassword = await hashPassword(temporaryPassword);

	// Create user, account, and staff records
	const { staff } = await createUser({
		tenantId,
		data,
		hashedPassword,
	});

	// Send welcome email with temporary credentials
	try {
		await sendEmail({
			to: email,
			subject: `Welcome to ${hospital.name} - Your Account Has Been Created`,
			html: getWelcomeEmailTemplate({
				firstName,
				hospitalName: hospital.name,
				username: email, // Use email as username for login
				temporaryPassword,
				loginUrl: process.env.CORS_ORIGIN || "",
			}),
			category: "Welcome",
		});
		logger.info({ email }, "Welcome email sent");
	} catch (emailError) {
		logger.error({ error: emailError }, "Failed to send welcome email");
		// Don't fail the request if email fails
	}

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
		message: "Welcome email sent with temporary credentials",
	};
}
