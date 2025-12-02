// Brand colors
export const brandColors = {
	primary: "#d97706",
	primaryDark: "#b45309",
	primaryLight: "#fef3c7",
	textPrimary: "#1f2937",
	textSecondary: "#6b7280",
	border: "#e5e7eb",
	background: "#f9fafb",
	white: "#ffffff",
	warning: "#92400e",
	warningBg: "#fef3c7",
};

// Inline SVG logo (heart + EKG)
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${brandColors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 13.572l-7.5 7.428l-2.896 -2.868m-6.117 -8.104a5 5 0 0 1 9.013 -3.022a5 5 0 1 1 7.5 6.572" /><path d="M3 13h2l2 3l2 -6l1 3h3" /></svg>`;

export interface EmailWrapperOptions {
	title: string;
	preheader?: string;
	content: string;
	supportEmail?: string;
}

export function wrapEmailContent({
	title,
	preheader,
	content,
	supportEmail = "support@usehely.com",
}: EmailWrapperOptions): string {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="x-apple-disable-message-reformatting">
	<title>${title}</title>
	${preheader ? `<!--[if !mso]><!--><span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;visibility:hidden;mso-hide:all;">${preheader}</span><!--<![endif]-->` : ""}
</head>
<body style="margin: 0; padding: 0; background-color: ${brandColors.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
	<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${brandColors.background};">
		<tr>
			<td align="center" style="padding: 40px 20px;">
				<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${brandColors.white}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
					<!-- Header -->
					<tr>
						<td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid ${brandColors.border};">
							<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
								<tr>
									<td style="vertical-align: middle;">
										<table role="presentation" cellpadding="0" cellspacing="0">
											<tr>
												<td style="vertical-align: middle; padding-right: 12px;">
													${logoSvg}
												</td>
												<td style="vertical-align: middle;">
													<span style="font-size: 24px; font-weight: 700; color: ${brandColors.primary}; letter-spacing: -0.5px;">useHely</span>
												</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<!-- Content -->
					<tr>
						<td style="padding: 40px;">
							${content}
						</td>
					</tr>
					<!-- Footer -->
					<tr>
						<td style="padding: 24px 40px 32px 40px; border-top: 1px solid ${brandColors.border}; background-color: ${brandColors.background}; border-radius: 0 0 12px 12px;">
							<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
								<tr>
									<td align="center">
										<p style="margin: 0 0 8px 0; font-size: 14px; color: ${brandColors.textSecondary}; font-weight: 500;">
											useHely - Hospital Management System
										</p>
										<p style="margin: 0; font-size: 13px; color: ${brandColors.textSecondary};">
											Questions? Contact <a href="mailto:${supportEmail}" style="color: ${brandColors.primary}; text-decoration: none;">${supportEmail}</a>
										</p>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();
}

// Shared component styles
export const emailStyles = {
	heading: `margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: ${brandColors.textPrimary}; line-height: 1.3;`,
	paragraph: `margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: ${brandColors.textPrimary};`,
	paragraphMuted: `margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${brandColors.textSecondary};`,
	button: `display: inline-block; background-color: ${brandColors.primary}; color: ${brandColors.white}; padding: 14px 32px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;`,
	card: `background-color: ${brandColors.white}; border: 1px solid ${brandColors.border}; border-left: 4px solid ${brandColors.primary}; border-radius: 8px; padding: 20px; margin: 24px 0;`,
	warningBox: `background-color: ${brandColors.warningBg}; border-left: 4px solid ${brandColors.primary}; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;`,
	warningText: `margin: 0; font-size: 14px; font-weight: 600; color: ${brandColors.warning};`,
	linkBox: `background-color: ${brandColors.background}; border: 1px solid ${brandColors.border}; border-radius: 8px; padding: 12px 16px; word-break: break-all; font-size: 13px; color: ${brandColors.textSecondary}; font-family: 'SF Mono', Monaco, 'Courier New', monospace;`,
	label: `font-size: 13px; color: ${brandColors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;`,
	value: `font-size: 16px; color: ${brandColors.textPrimary}; font-weight: 500;`,
	divider: `border: none; border-top: 1px solid ${brandColors.border}; margin: 32px 0;`,
};
