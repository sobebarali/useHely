import { emailStyles, wrapEmailContent } from "./base.template.js";

export interface PasswordResetEmailData {
	firstName: string;
	hospitalName: string;
	resetUrl: string;
}

export function getPasswordResetEmailTemplate(
	data: PasswordResetEmailData,
): string {
	const { firstName, hospitalName, resetUrl } = data;

	const content = `
		<h1 style="${emailStyles.heading}">Reset Your Password</h1>

		<p style="${emailStyles.paragraph}">Hello ${firstName},</p>

		<p style="${emailStyles.paragraph}">We received a request to reset your password for your account at <strong>${hospitalName}</strong>.</p>

		<p style="${emailStyles.paragraph}">Click the button below to create a new password:</p>

		<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
			<tr>
				<td align="center" style="padding: 16px 0 32px 0;">
					<a href="${resetUrl}" style="${emailStyles.button}">Reset Password</a>
				</td>
			</tr>
		</table>

		<p style="${emailStyles.paragraphMuted}">Or copy and paste this link into your browser:</p>
		<p style="${emailStyles.linkBox}">${resetUrl}</p>

		<div style="${emailStyles.warningBox}">
			<p style="${emailStyles.warningText}">This link will expire in 1 hour for security reasons.</p>
		</div>

		<hr style="${emailStyles.divider}">

		<p style="${emailStyles.paragraphMuted}">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
	`;

	return wrapEmailContent({
		title: "Reset Your Password",
		preheader: `Password reset request for your ${hospitalName} account`,
		content,
	});
}

export function getPasswordResetEmailText(
	data: PasswordResetEmailData,
): string {
	const { firstName, hospitalName, resetUrl } = data;

	return `
Reset Your Password
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hello ${firstName},

We received a request to reset your password for your account at ${hospitalName}.

Click the link below to create a new password:
${resetUrl}

⚠ This link will expire in 1 hour for security reasons.

──────────────────────────────
If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.

useHely - Hospital Management System
Questions? Contact support@usehely.com
	`.trim();
}
