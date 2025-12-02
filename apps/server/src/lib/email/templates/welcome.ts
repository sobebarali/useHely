import { brandColors, emailStyles, wrapEmailContent } from "./base.template.js";

export interface WelcomeEmailData {
	firstName: string;
	hospitalName: string;
	username: string;
	temporaryPassword: string;
	loginUrl: string;
}

export function getWelcomeEmailTemplate(data: WelcomeEmailData): string {
	const { firstName, hospitalName, username, temporaryPassword, loginUrl } =
		data;

	const content = `
		<h1 style="${emailStyles.heading}">Welcome to ${hospitalName}</h1>

		<p style="${emailStyles.paragraph}">Hello ${firstName},</p>

		<p style="${emailStyles.paragraph}">Your account has been created at <strong>${hospitalName}</strong>. You can now access the Hospital Management System using the credentials below.</p>

		<div style="${emailStyles.card}">
			<p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: ${brandColors.textPrimary};">Your Login Credentials</p>
			<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
				<tr>
					<td style="padding: 8px 0;">
						<span style="${emailStyles.label}">Email</span><br>
						<span style="${emailStyles.value}">${username}</span>
					</td>
				</tr>
				<tr>
					<td style="padding: 8px 0;">
						<span style="${emailStyles.label}">Temporary Password</span><br>
						<span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 18px; font-weight: 600; color: ${brandColors.primary}; background-color: ${brandColors.primaryLight}; padding: 4px 12px; border-radius: 6px; display: inline-block; margin-top: 4px;">${temporaryPassword}</span>
					</td>
				</tr>
			</table>
		</div>

		<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
			<tr>
				<td align="center" style="padding: 8px 0 32px 0;">
					<a href="${loginUrl}" style="${emailStyles.button}">Login to Your Account</a>
				</td>
			</tr>
		</table>

		<div style="${emailStyles.warningBox}">
			<p style="${emailStyles.warningText}">Important: You will be required to change your password on first login.</p>
		</div>

		<p style="${emailStyles.paragraph}"><strong>Security Tips:</strong></p>
		<ul style="margin: 0 0 16px 0; padding-left: 20px; color: ${brandColors.textSecondary}; font-size: 14px; line-height: 1.8;">
			<li>Never share your password with anyone</li>
			<li>Use a strong password with uppercase, lowercase, numbers, and special characters</li>
			<li>Log out after each session when using shared computers</li>
		</ul>

		<hr style="${emailStyles.divider}">

		<p style="${emailStyles.paragraphMuted}">If you did not expect this email, please contact your hospital administrator immediately.</p>
	`;

	return wrapEmailContent({
		title: `Welcome to ${hospitalName}`,
		preheader: `Your account has been created at ${hospitalName}`,
		content,
	});
}

export function getWelcomeEmailText(data: WelcomeEmailData): string {
	const { firstName, hospitalName, username, temporaryPassword, loginUrl } =
		data;

	return `
Welcome to ${hospitalName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hello ${firstName},

Your account has been created at ${hospitalName}. You can now access the Hospital Management System using the credentials below.

YOUR LOGIN CREDENTIALS
──────────────────────
Email: ${username}
Temporary Password: ${temporaryPassword}

Login URL: ${loginUrl}

⚠ IMPORTANT: You will be required to change your password on first login.

SECURITY TIPS
─────────────
• Never share your password with anyone
• Use a strong password with uppercase, lowercase, numbers, and special characters
• Log out after each session when using shared computers

──────────────────────────────
If you did not expect this email, please contact your hospital administrator immediately.

useHely - Hospital Management System
Questions? Contact support@usehely.com
	`.trim();
}
