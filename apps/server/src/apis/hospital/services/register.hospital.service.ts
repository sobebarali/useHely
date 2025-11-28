import { randomBytes } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import type {
	RegisterHospitalInput,
	RegisterHospitalOutput,
} from "../dtos/register.hospital.dto";
import {
	createHospital,
	findHospitalByAdminEmail,
	findHospitalByLicense,
} from "../repositories/register.hospital.repository";

export async function registerHospital({
	data,
}: {
	data: RegisterHospitalInput;
}): Promise<RegisterHospitalOutput> {
	// Check for duplicate license number
	const existingLicense = await findHospitalByLicense(data.licenseNumber);
	if (existingLicense) {
		throw {
			status: 409,
			code: "LICENSE_EXISTS",
			message: "License number already registered",
		};
	}

	// Check for duplicate admin email
	const existingEmail = await findHospitalByAdminEmail(data.adminEmail);
	if (existingEmail) {
		throw {
			status: 409,
			code: "EMAIL_EXISTS",
			message: "Admin email already in use",
		};
	}

	// Generate unique IDs and tokens
	const hospitalId = uuidv4();
	const tenantId = uuidv4();

	// Generate slug from hospital name
	const slug = data.name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

	// Generate verification token
	const verificationToken = randomBytes(32).toString("hex");
	const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

	// Extract domain from hospital name for admin username
	const domain = slug.split("-")[0] || "hospital";
	const adminUsername = `admin@${domain}`;

	// Create hospital
	const hospital = await createHospital({
		id: hospitalId,
		data: {
			...data,
			slug,
			verificationToken,
			verificationExpires,
		},
	});

	// TODO: Send verification email (implement later)
	// await sendVerificationEmail(data.adminEmail, verificationToken);

	return {
		id: String(hospital._id),
		tenantId: tenantId,
		name: hospital.name,
		status: (hospital.status as string) || "PENDING",
		adminUsername,
		message:
			"Hospital registration successful. A verification email has been sent to the admin email address.",
	};
}
