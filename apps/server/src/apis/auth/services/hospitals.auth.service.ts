import { createServiceLogger } from "../../../lib/logger";
import { findHospitalsForEmail } from "../repositories/hospitals.auth.repository";
import type { HospitalsOutput } from "../validations/hospitals.auth.validation";

const logger = createServiceLogger("hospitalsAuth");

/**
 * Get list of hospitals for a user by their email
 */
export async function getHospitalsForEmail({
	email,
}: {
	email: string;
}): Promise<HospitalsOutput> {
	logger.info(
		{ email: `****@${email.split("@")[1] || "***"}` },
		"Looking up hospitals for email",
	);

	const hospitals = await findHospitalsForEmail({ email });

	logger.info(
		{ email: `****@${email.split("@")[1] || "***"}`, count: hospitals.length },
		"Found hospitals for email",
	);

	return {
		success: true,
		data: hospitals,
	};
}
