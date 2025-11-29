import { Role } from "@hms/db";
import { RoleNames } from "../../../constants";
import { InternalError } from "../../../errors";
import { getWelcomeEmailTemplate } from "../../../lib/email/templates/welcome";
import { createServiceLogger, logError } from "../../../lib/logger";
import { sendEmail } from "../../../lib/mailer";
import { seedSystemRoles } from "../../../lib/seed/system-roles.seed";
import {
	generateTemporaryPassword,
	hashPassword,
} from "../../users/repositories/shared.users.repository";
import {
	checkAdminExists,
	createAdminUser,
	createDefaultDepartment,
} from "../repositories/provision-tenant.hospital.repository";

const logger = createServiceLogger("provisionTenant");

export interface ProvisionTenantInput {
	tenantId: string;
	hospitalName: string;
	adminEmail: string;
	adminPhone: string;
	adminName?: string;
}

export interface ProvisionTenantOutput {
	success: boolean;
	adminCreated: boolean;
	rolesSeeded: boolean;
	departmentCreated: boolean;
	message: string;
}

/**
 * Provision a new tenant with system roles, default department, and admin user
 * This is called after hospital verification is successful
 */
export async function provisionTenant({
	tenantId,
	hospitalName,
	adminEmail,
	adminPhone,
	adminName,
}: ProvisionTenantInput): Promise<ProvisionTenantOutput> {
	logger.info({ tenantId, adminEmail }, "Starting tenant provisioning");

	let rolesSeeded = false;
	let departmentCreated = false;
	let adminCreated = false;

	try {
		// Step 1: Seed system roles for the tenant
		logger.debug({ tenantId }, "Seeding system roles");
		await seedSystemRoles({ tenantId });
		rolesSeeded = true;
		logger.info({ tenantId }, "System roles seeded successfully");

		// Step 2: Create default Administration department
		logger.debug({ tenantId }, "Creating default department");
		const department = await createDefaultDepartment({ tenantId });
		departmentCreated = true;
		logger.info(
			{ tenantId, departmentId: department._id },
			"Default department created successfully",
		);

		// Step 3: Check if admin already exists (idempotency)
		const adminExists = await checkAdminExists({ tenantId, adminEmail });
		if (adminExists) {
			logger.info(
				{ tenantId, adminEmail },
				"Admin user already exists, skipping creation",
			);
			return {
				success: true,
				adminCreated: false,
				rolesSeeded,
				departmentCreated,
				message: "Tenant already provisioned",
			};
		}

		// Step 4: Get HOSPITAL_ADMIN role ID for the tenant
		const hospitalAdminRole = await Role.findOne({
			tenantId,
			name: RoleNames.HOSPITAL_ADMIN,
			isSystem: true,
		}).lean();

		if (!hospitalAdminRole) {
			logger.error({ tenantId }, "HOSPITAL_ADMIN role not found after seeding");
			throw new InternalError("Failed to find HOSPITAL_ADMIN role");
		}

		// Step 5: Generate temporary password and create admin user
		const displayName = adminName || `${hospitalName} Admin`;
		const temporaryPassword = generateTemporaryPassword();
		const hashedPwd = await hashPassword(temporaryPassword);

		logger.debug({ tenantId, adminEmail }, "Creating admin user");

		await createAdminUser({
			tenantId,
			adminEmail,
			adminName: displayName,
			adminPhone,
			hashedPassword: hashedPwd,
			hospitalAdminRoleId: String(hospitalAdminRole._id),
			adminDepartmentId: String(department._id),
		});

		adminCreated = true;
		logger.info({ tenantId, adminEmail }, "Admin user created successfully");

		// Step 6: Send welcome email with credentials
		try {
			await sendEmail({
				to: adminEmail,
				subject: `Welcome to ${hospitalName} - Your Admin Account Has Been Created`,
				html: getWelcomeEmailTemplate({
					firstName: displayName.split(" ")[0] || "Admin",
					hospitalName,
					username: adminEmail,
					temporaryPassword,
					loginUrl: process.env.CORS_ORIGIN || "",
				}),
				category: "Welcome",
			});
			logger.info({ adminEmail }, "Welcome email sent to admin");
		} catch (emailError) {
			// Log error but don't fail provisioning if email fails
			logError(logger, emailError, "Failed to send welcome email", {
				adminEmail,
			});
		}

		logger.info(
			{ tenantId, adminEmail },
			"Tenant provisioning completed successfully",
		);

		return {
			success: true,
			adminCreated,
			rolesSeeded,
			departmentCreated,
			message: "Tenant provisioned successfully",
		};
	} catch (error) {
		logError(logger, error, "Tenant provisioning failed", {
			tenantId,
			rolesSeeded,
			departmentCreated,
			adminCreated,
		});

		// Re-throw the error to be handled by the caller
		throw error;
	}
}
