import { createServiceLogger } from "../logger";
import { sendEmail } from "../mailer";
import {
	getHospitalVerificationEmailHtml,
	getHospitalVerificationEmailText,
	type HospitalVerificationEmailData,
} from "./templates/hospital-verification.template";

const logger = createServiceLogger("hospitalEmailService");

export async function sendHospitalVerificationEmail({
	to,
	data,
}: {
	to: string;
	data: HospitalVerificationEmailData;
}): Promise<void> {
	logger.info(
		{ to, hospitalName: data.hospitalName },
		"Sending hospital verification email",
	);

	try {
		await sendEmail({
			to,
			subject: "Verify Your Hospital Registration - HMS",
			category: "Hospital Registration",
			html: getHospitalVerificationEmailHtml(data),
			text: getHospitalVerificationEmailText(data),
		});

		logger.info({ to }, "Hospital verification email sent successfully");
	} catch (error) {
		logger.error(
			{ error, to, hospitalName: data.hospitalName },
			"Failed to send hospital verification email",
		);
		throw error;
	}
}
