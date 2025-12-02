import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Email sender configuration
export const emailConfig = {
	from: process.env.EMAIL_FROM || "hello@example.com",
	fromName: process.env.EMAIL_FROM_NAME || "useHely",
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
		return { id: "test-message-id" };
	}

	const { data, error } = await resend.emails.send({
		from: `${emailConfig.fromName} <${emailConfig.from}>`,
		to: Array.isArray(to) ? to : [to],
		subject,
		html: html || undefined,
		text: text || subject,
	});

	if (error) {
		throw error;
	}

	return data;
}
