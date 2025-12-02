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

	return `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px;">
					<h1 style="color: #2563eb; margin-top: 0;">Welcome to Hospital Management System</h1>
					
					<p>Hello,</p>
					
					<p>Thank you for registering <strong>${hospitalName}</strong> with our Hospital Management System.</p>
					
					<div style="background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
						<p style="margin: 0;"><strong>Hospital Details:</strong></p>
						<ul style="margin: 10px 0; padding-left: 20px;">
							<li>Hospital Name: ${hospitalName}</li>
							<li>License Number: ${licenseNumber}</li>
							<li>Admin Email: ${adminEmail}</li>
						</ul>
					</div>
					
					<p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
					
					<div style="text-align: center; margin: 30px 0;">
						<a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
					</div>
					
					<p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
					<p style="background-color: #e5e7eb; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">${verificationUrl}</p>
					
					<p style="color: #dc2626; font-weight: bold;">⚠️ This verification link will expire in 24 hours.</p>
					
					<p>Once verified, your hospital status will change to <strong>VERIFIED</strong> and you can proceed with the onboarding process.</p>
					
					<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
					
					<p style="color: #6b7280; font-size: 12px;">If you did not register this hospital, please ignore this email.</p>
					<p style="color: #6b7280; font-size: 12px;">For support, contact us at ${supportEmail}</p>
				</div>
			</body>
		</html>
	`;
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
Welcome to Hospital Management System

Thank you for registering ${hospitalName} with our Hospital Management System.

Hospital Details:
- Hospital Name: ${hospitalName}
- License Number: ${licenseNumber}
- Admin Email: ${adminEmail}

To complete your registration and activate your account, please verify your email address by visiting the following link:

${verificationUrl}

⚠️ This verification link will expire in 24 hours.

Once verified, your hospital status will change to VERIFIED and you can proceed with the onboarding process.

If you did not register this hospital, please ignore this email.

For support, contact us at ${supportEmail}
	`.trim();
}
