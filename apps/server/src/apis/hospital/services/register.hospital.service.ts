import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { ConflictError } from "../../../errors";
import { setVerificationToken } from "../../../lib/cache/hospital.cache";
import { sendHospitalVerificationEmail } from "../../../lib/email/hospital-email.service";
import { createServiceLogger, logError } from "../../../lib/logger";
import { createHospital } from "../repositories/register.hospital.repository";
import {
	findHospitalByAdminEmail,
	findHospitalByLicense,
} from "../repositories/shared.hospital.repository";
import type {
	RegisterHospitalInput,
	RegisterHospitalOutput,
} from "../validations/register.hospital.validation";

const logger = createServiceLogger("registerHospital");

export async function registerHospital({
	name,
	address,
	contactEmail,
	contactPhone,
	licenseNumber,
	adminEmail,
	adminPhone,
}: RegisterHospitalInput): Promise<RegisterHospitalOutput> {
	logger.info(
		{
			hospitalName: name,
			licenseNumber,
		},
		"Starting hospital registration",
	);

	// Check for duplicate license number
	logger.debug({ licenseNumber }, "Checking for duplicate license");
	const existingLicense = await findHospitalByLicense({ licenseNumber });
	if (existingLicense) {
		logger.warn(
			{
				licenseNumber,
				existingHospitalId: existingLicense._id,
			},
			"License number already exists",
		);
		throw new ConflictError(
			"License number already registered",
			"LICENSE_EXISTS",
		);
	}
	logger.debug("License number is unique");

	// Check for duplicate admin email
	logger.debug(
		{ adminEmail: `****@${adminEmail.split("@")[1]}` },
		"Checking for duplicate admin email",
	);
	const existingEmail = await findHospitalByAdminEmail({ adminEmail });
	if (existingEmail) {
		logger.warn(
			{
				adminEmail: `****@${adminEmail.split("@")[1]}`,
				existingHospitalId: existingEmail._id,
			},
			"Admin email already exists",
		);
		throw new ConflictError("Admin email already in use", "EMAIL_EXISTS");
	}
	logger.debug("Admin email is unique");

	// Generate unique ID - hospitalId IS the tenantId
	const hospitalId = uuidv4();

	logger.debug(
		{
			hospitalId,
		},
		"Generated hospital ID (used as tenantId)",
	);

	// Generate slug from hospital name
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

	logger.debug({ slug }, "Generated slug from hospital name");

	// Generate verification token
	const verificationToken = randomBytes(32).toString("hex");
	const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

	logger.debug(
		{
			verificationExpires: verificationExpires.toISOString(),
		},
		"Generated verification token",
	);

	// Extract domain from hospital name for admin username
	const domain = slug.split("-")[0] || "hospital";
	const adminUsername = `admin@${domain}`;

	logger.debug({ adminUsername }, "Generated admin username");

	try {
		// Create hospital
		logger.info({ hospitalId }, "Creating hospital record");
		const hospital = await createHospital({
			id: hospitalId,
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
		});

		logger.info(
			{
				hospitalId: String(hospital._id),
				status: hospital.status,
			},
			"Hospital created successfully",
		);

		// Store verification token in Redis with 24 hour TTL
		await setVerificationToken(hospitalId, verificationToken, 24 * 60 * 60);
		logger.debug(
			{ hospitalId },
			"Verification token stored in Redis with 24h TTL",
		);

		// Send verification email
		try {
			logger.info({ adminEmail }, "Sending verification email");
			const verificationUrl = `${process.env.CORS_ORIGIN}/verify-hospital?hospitalId=${hospitalId}&token=${verificationToken}`;

			await sendHospitalVerificationEmail({
				to: adminEmail,
				data: {
					hospitalName: name,
					licenseNumber,
					adminUsername,
					verificationUrl,
					supportEmail: contactEmail,
				},
			});

			logger.info({ adminEmail }, "Verification email sent successfully");
		} catch (emailError) {
			logError(logger, emailError, "Failed to send verification email", {
				hospitalId,
				adminEmail,
			});
			// Don't throw - hospital was created successfully, email failure shouldn't block registration
			logger.warn(
				"Hospital registration completed but verification email failed to send",
			);
		}

		return {
			id: String(hospital._id),
			tenantId: hospitalId,
			name: hospital.name,
			status: (hospital.status as string) || "PENDING",
			adminUsername,
			message:
				"Hospital registration successful. A verification email has been sent to the admin email address.",
		};
	} catch (error) {
		logError(logger, error, "Failed to create hospital", {
			hospitalId,
			hospitalName: name,
		});
		throw error;
	}
}
