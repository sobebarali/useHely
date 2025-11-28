import { MailtrapTransport } from "mailtrap";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport(
	MailtrapTransport({
		token: process.env.MAILTRAP_API_TOKEN || "",
		testInboxId: Number.parseInt(process.env.MAILTRAP_TEST_INBOX_ID || "0", 10),
	}),
);

// Email sender configuration
export const emailConfig = {
	from: process.env.EMAIL_FROM || "hello@example.com",
	fromName: process.env.EMAIL_FROM_NAME || "HMS",
};

// Helper function to send emails
export async function sendEmail({
	to,
	subject,
	text,
	html,
	category,
}: {
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
	category?: string;
}) {
	// Skip sending emails in test environment
	if (process.env.NODE_ENV === "test") {
		console.log("[TEST MODE] Email not sent:", { to, subject, category });
		return { messageId: "test-message-id" };
	}

	const mailOptions = {
		from: {
			address: emailConfig.from,
			name: emailConfig.fromName,
		},
		to,
		subject,
		text,
		html,
		category: category || "General",
		sandbox: process.env.NODE_ENV !== "production",
	};

	return await transporter.sendMail(mailOptions);
}
