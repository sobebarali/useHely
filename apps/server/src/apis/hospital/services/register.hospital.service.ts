import { randomBytes } from "node:crypto";
import {
	OrganizationStatus,
	OrganizationType,
	type OrganizationTypeValue,
} from "@hms/db";
import { v4 as uuidv4 } from "uuid";
import { ConflictError } from "../../../errors";
import { setVerificationToken } from "../../../lib/cache/hospital.cache";
import { sendHospitalVerificationEmail } from "../../../lib/email/hospital-email.service";
import { createServiceLogger, logError } from "../../../lib/logger";
import { findUserByEmail } from "../../users/repositories/shared.users.repository";
import { createHospital } from "../repositories/register.hospital.repository";
import {
	findHospitalByAdminEmail,
	findHospitalByLicense,
} from "../repositories/shared.hospital.repository";
import type {
	RegisterHospitalInput,
	RegisterHospitalOutput,
} from "../validations/register.hospital.validation";
import { provisionTenant } from "./provision-tenant.hospital.service";

const logger = createServiceLogger("registerHospital");

export async function registerHospital({
	type = OrganizationType.HOSPITAL,
	name,
	address,
	contactEmail,
	contactPhone,
	licenseNumber,
	adminEmail,
	adminPhone,
	pricingTier,
}: RegisterHospitalInput): Promise<RegisterHospitalOutput> {
	const isSelfService = type !== OrganizationType.HOSPITAL;

	logger.info(
		{
			organizationName: name,
			type,
			licenseNumber: licenseNumber || "N/A",
			isSelfService,
		},
		"Starting organization registration",
	);

	// Check for duplicate license number (only for hospitals with license)
	if (licenseNumber) {
		logger.debug({ licenseNumber }, "Checking for duplicate license");
		const existingLicense = await findHospitalByLicense({ licenseNumber });
		if (existingLicense) {
			logger.warn(
				{
					licenseNumber,
					existingOrganizationId: existingLicense._id,
				},
				"License number already exists",
			);
			throw new ConflictError(
				"License number already registered",
				"LICENSE_EXISTS",
			);
		}
		logger.debug("License number is unique");
	}

	// Check for duplicate admin email in Organization
	logger.debug(
		{ adminEmail: `****@${adminEmail.split("@")[1]}` },
		"Checking for duplicate admin email",
	);
	const existingEmail = await findHospitalByAdminEmail({ adminEmail });
	if (existingEmail) {
		logger.warn(
			{
				adminEmail: `****@${adminEmail.split("@")[1]}`,
				existingOrganizationId: existingEmail._id,
			},
			"Admin email already exists",
		);
		throw new ConflictError("Admin email already in use", "EMAIL_EXISTS");
	}
	logger.debug("Admin email is unique in Organization");

	// Check for duplicate admin email in User collection (global uniqueness)
	logger.debug(
		{ adminEmail: `****@${adminEmail.split("@")[1]}` },
		"Checking for existing user with admin email",
	);
	const existingUser = await findUserByEmail({ email: adminEmail });
	if (existingUser) {
		logger.warn(
			{
				adminEmail: `****@${adminEmail.split("@")[1]}`,
				existingUserId: existingUser._id,
			},
			"Admin email already exists as a registered user",
		);
		throw new ConflictError(
			"Email already registered in the system. Please login to register a new organization.",
			"EMAIL_EXISTS",
		);
	}
	logger.debug("Admin email is unique across the system");

	// Generate unique ID - organizationId IS the tenantId
	const organizationId = uuidv4();

	logger.debug(
		{
			organizationId,
			type,
		},
		"Generated organization ID (used as tenantId)",
	);

	// Generate slug from organization name
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

	logger.debug({ slug }, "Generated slug from organization name");

	// Self-service flow for CLINIC and SOLO_PRACTICE
	if (isSelfService) {
		return registerSelfService({
			organizationId,
			type: type as OrganizationTypeValue,
			name,
			slug,
			address,
			contactEmail,
			contactPhone,
			adminEmail,
			adminPhone,
			pricingTier,
		});
	}

	// Hospital flow - requires verification
	return registerHospitalWithVerification({
		organizationId,
		type: type as OrganizationTypeValue,
		name,
		slug,
		licenseNumber: licenseNumber as string, // Required for hospitals
		address,
		contactEmail,
		contactPhone,
		adminEmail,
		adminPhone,
		pricingTier,
	});
}

/**
 * Self-service registration for CLINIC and SOLO_PRACTICE
 * Creates organization, provisions tenant, and returns credentials immediately
 */
async function registerSelfService({
	organizationId,
	type,
	name,
	slug,
	address,
	contactEmail,
	contactPhone,
	adminEmail,
	adminPhone,
	pricingTier,
}: {
	organizationId: string;
	type: OrganizationTypeValue;
	name: string;
	slug: string;
	address: RegisterHospitalInput["address"];
	contactEmail: string;
	contactPhone: string;
	adminEmail: string;
	adminPhone: string;
	pricingTier?: string;
}): Promise<RegisterHospitalOutput> {
	logger.info(
		{ organizationId, type },
		"Starting self-service registration (auto-activation)",
	);

	try {
		// Create organization with ACTIVE status directly
		const organization = await createHospital({
			id: organizationId,
			type,
			name,
			slug,
			address,
			contactEmail,
			contactPhone,
			adminEmail,
			adminPhone,
			status: OrganizationStatus.ACTIVE,
			pricingTier: pricingTier as
				| "FREE"
				| "STARTER"
				| "PROFESSIONAL"
				| "ENTERPRISE"
				| undefined,
		});

		logger.info(
			{
				organizationId: String(organization._id),
				status: organization.status,
				type,
			},
			"Organization created with ACTIVE status",
		);

		// Provision tenant immediately (roles, department, admin user)
		const provisionResult = await provisionTenant({
			tenantId: organizationId,
			hospitalName: name,
			adminEmail,
			adminPhone,
			organizationType: type,
		});

		logger.info(
			{
				organizationId,
				adminCreated: provisionResult.adminCreated,
				rolesSeeded: provisionResult.rolesSeeded,
			},
			"Tenant provisioned successfully for self-service registration",
		);

		return {
			id: String(organization._id),
			tenantId: organizationId,
			name: organization.name,
			type,
			status: OrganizationStatus.ACTIVE,
			message: `Your ${type === OrganizationType.CLINIC ? "clinic" : "practice"} has been registered and activated. Check your email for login credentials.`,
		};
	} catch (error) {
		logError(logger, error, "Failed to complete self-service registration", {
			organizationId,
			organizationName: name,
			type,
		});
		throw error;
	}
}

/**
 * Hospital registration with verification flow
 * Creates organization in PENDING state, requires email verification
 */
async function registerHospitalWithVerification({
	organizationId,
	type,
	name,
	slug,
	licenseNumber,
	address,
	contactEmail,
	contactPhone,
	adminEmail,
	adminPhone,
	pricingTier,
}: {
	organizationId: string;
	type: OrganizationTypeValue;
	name: string;
	slug: string;
	licenseNumber: string;
	address: RegisterHospitalInput["address"];
	contactEmail: string;
	contactPhone: string;
	adminEmail: string;
	adminPhone: string;
	pricingTier?: string;
}): Promise<RegisterHospitalOutput> {
	// Generate verification token
	const verificationToken = randomBytes(32).toString("hex");
	const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

	logger.debug(
		{
			verificationExpires: verificationExpires.toISOString(),
		},
		"Generated verification token",
	);

	try {
		// Create organization in PENDING status
		logger.info({ organizationId }, "Creating organization record");
		const organization = await createHospital({
			id: organizationId,
			type,
			name,
			slug,
			licenseNumber,
			address,
			contactEmail,
			contactPhone,
			adminEmail,
			adminPhone,
			verificationToken,
			verificationExpires,
			status: OrganizationStatus.PENDING,
			pricingTier: pricingTier as
				| "FREE"
				| "STARTER"
				| "PROFESSIONAL"
				| "ENTERPRISE"
				| undefined,
		});

		logger.info(
			{
				organizationId: String(organization._id),
				status: organization.status,
			},
			"Organization created successfully",
		);

		// Store verification token in Redis with 24 hour TTL
		await setVerificationToken(organizationId, verificationToken, 24 * 60 * 60);
		logger.debug(
			{ organizationId },
			"Verification token stored in Redis with 24h TTL",
		);

		// Send verification email
		try {
			logger.info({ adminEmail }, "Sending verification email");
			const verificationUrl = `${process.env.CORS_ORIGIN}/verify-hospital?hospitalId=${organizationId}&token=${verificationToken}`;

			await sendHospitalVerificationEmail({
				to: adminEmail,
				data: {
					hospitalName: name,
					licenseNumber,
					adminEmail,
					verificationUrl,
					supportEmail: contactEmail,
				},
			});

			logger.info({ adminEmail }, "Verification email sent successfully");
		} catch (emailError) {
			logError(logger, emailError, "Failed to send verification email", {
				organizationId,
				adminEmail,
			});
			// Don't throw - organization was created successfully, email failure shouldn't block registration
			logger.warn(
				"Organization registration completed but verification email failed to send",
			);
		}

		return {
			id: String(organization._id),
			tenantId: organizationId,
			name: organization.name,
			type,
			status: OrganizationStatus.PENDING,
			message:
				"Hospital registration successful. A verification email has been sent to the admin email address.",
		};
	} catch (error) {
		logError(logger, error, "Failed to create organization", {
			organizationId,
			organizationName: name,
		});
		throw error;
	}
}
