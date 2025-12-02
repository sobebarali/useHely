import { brandColors, emailStyles, wrapEmailContent } from "./base.template.js";

export interface HospitalVerificationEmailData {
	hospitalName: string;
	licenseNumber: string;
	adminEmail: string;
	verificationUrl: string;
	supportEmail: string;
}

export function getHospitalVerificationEmailHtml(
	data: HospitalVerificationEmailData,
): string {
	const {
		hospitalName,
		licenseNumber,
		adminEmail,
		verificationUrl,
		supportEmail,
	} = data;

	const content = `
		<h1 style="${emailStyles.heading}">Verify Your Hospital Registration</h1>

		<p style="${emailStyles.paragraph}">Thank you for registering <strong>${hospitalName}</strong> with useHely Hospital Management System.</p>

		<div style="${emailStyles.card}">
			<p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: ${brandColors.textPrimary};">Registration Details</p>
			<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
				<tr>
					<td style="padding: 8px 0;">
						<span style="${emailStyles.label}">Hospital Name</span><br>
						<span style="${emailStyles.value}">${hospitalName}</span>
					</td>
				</tr>
				<tr>
					<td style="padding: 8px 0;">
						<span style="${emailStyles.label}">License Number</span><br>
						<span style="${emailStyles.value}">${licenseNumber}</span>
					</td>
				</tr>
				<tr>
					<td style="padding: 8px 0;">
						<span style="${emailStyles.label}">Admin Email</span><br>
						<span style="${emailStyles.value}">${adminEmail}</span>
					</td>
				</tr>
			</table>
		</div>

		<p style="${emailStyles.paragraph}">To complete your registration and activate your account, please verify your email address:</p>

		<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
			<tr>
				<td align="center" style="padding: 16px 0 32px 0;">
					<a href="${verificationUrl}" style="${emailStyles.button}">Verify Email Address</a>
				</td>
			</tr>
		</table>

		<p style="${emailStyles.paragraphMuted}">Or copy and paste this link into your browser:</p>
		<p style="${emailStyles.linkBox}">${verificationUrl}</p>

		<div style="${emailStyles.warningBox}">
			<p style="${emailStyles.warningText}">This verification link will expire in 24 hours.</p>
		</div>

		<p style="${emailStyles.paragraph}">Once verified, your hospital status will change to <strong>VERIFIED</strong> and you can proceed with the onboarding process.</p>

		<hr style="${emailStyles.divider}">

		<p style="${emailStyles.paragraphMuted}">If you did not register this hospital, please ignore this email or contact us at <a href="mailto:${supportEmail}" style="color: ${brandColors.primary}; text-decoration: none;">${supportEmail}</a>.</p>
	`;

	return wrapEmailContent({
		title: "Verify Your Hospital Registration",
		preheader: `Verify your email to complete ${hospitalName} registration`,
		content,
		supportEmail,
	});
}

export function getHospitalVerificationEmailText(
	data: HospitalVerificationEmailData,
): string {
	const {
		hospitalName,
		licenseNumber,
		adminEmail,
		verificationUrl,
		supportEmail,
	} = data;

	return `
Verify Your Hospital Registration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for registering ${hospitalName} with useHely Hospital Management System.

REGISTRATION DETAILS
────────────────────
Hospital Name: ${hospitalName}
License Number: ${licenseNumber}
Admin Email: ${adminEmail}

To complete your registration and activate your account, please verify your email address by visiting:
${verificationUrl}

⚠ This verification link will expire in 24 hours.

Once verified, your hospital status will change to VERIFIED and you can proceed with the onboarding process.

──────────────────────────────
If you did not register this hospital, please ignore this email or contact us at ${supportEmail}.

useHely - Hospital Management System
Questions? Contact ${supportEmail}
	`.trim();
}
