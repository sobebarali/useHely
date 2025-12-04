/**
 * Email Worker
 *
 * Processes email sending jobs from the email queue
 */

import { type Job, Worker } from "bullmq";
import { Resend } from "resend";
import {
	getHospitalVerificationEmailHtml,
	getHospitalVerificationEmailText,
} from "../../email/templates/hospital-verification.template";
import {
	getPasswordResetEmailTemplate,
	getPasswordResetEmailText,
} from "../../email/templates/password-reset";
import {
	getLinkedUserEmailTemplate,
	getLinkedUserEmailText,
	getWelcomeEmailTemplate,
	getWelcomeEmailText,
} from "../../email/templates/welcome";
import { createUtilLogger, logError, logSuccess } from "../../logger";
import { createRedisConnection } from "../../redis";
import {
	EMAIL_JOB_TYPES,
	type SendEmailJobData,
	type SendHospitalVerificationEmailJobData,
	type SendLinkedUserEmailJobData,
	type SendPasswordResetEmailJobData,
	type SendWelcomeEmailJobData,
} from "../jobs/email.job";
import { QUEUE_NAMES } from "../queues";

const logger = createUtilLogger("emailWorker");

// Email configuration
const resend = new Resend(process.env.RESEND_API_KEY);
const emailConfig = {
	from: process.env.EMAIL_FROM || "hello@example.com",
	fromName: process.env.EMAIL_FROM_NAME || "useHely",
};

/**
 * Send a generic email
 */
async function sendGenericEmail(data: SendEmailJobData): Promise<void> {
	const { to, subject, text, html, category } = data;

	// Skip sending emails in test environment
	if (process.env.NODE_ENV === "test") {
		logger.info({ to, subject, category }, "[TEST MODE] Email not sent");
		return;
	}

	const { error } = await resend.emails.send({
		from: `${emailConfig.fromName} <${emailConfig.from}>`,
		to: Array.isArray(to) ? to : [to],
		subject,
		html: html || undefined,
		text: text || subject,
	});

	if (error) {
		throw error;
	}
}

/**
 * Send welcome email with temporary password
 */
async function sendWelcomeEmail(data: SendWelcomeEmailJobData): Promise<void> {
	const { to, name, temporaryPassword, hospitalName, loginUrl } = data;

	if (process.env.NODE_ENV === "test") {
		logger.info({ to, name }, "[TEST MODE] Welcome email not sent");
		return;
	}

	const templateData = {
		firstName: name,
		hospitalName,
		username: to,
		temporaryPassword,
		loginUrl: loginUrl || `${process.env.BACKEND_URL}/login`,
	};

	const html = getWelcomeEmailTemplate(templateData);
	const text = getWelcomeEmailText(templateData);

	const { error } = await resend.emails.send({
		from: `${emailConfig.fromName} <${emailConfig.from}>`,
		to: [to],
		subject: `Welcome to ${hospitalName}`,
		html,
		text,
	});

	if (error) {
		throw error;
	}
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(
	data: SendPasswordResetEmailJobData,
): Promise<void> {
	const { to, name, resetUrl } = data;

	if (process.env.NODE_ENV === "test") {
		logger.info({ to, name }, "[TEST MODE] Password reset email not sent");
		return;
	}

	// The template needs hospitalName, but we may not have it - use a default
	const templateData = {
		firstName: name,
		hospitalName: "useHely",
		resetUrl,
	};

	const html = getPasswordResetEmailTemplate(templateData);
	const text = getPasswordResetEmailText(templateData);

	const { error } = await resend.emails.send({
		from: `${emailConfig.fromName} <${emailConfig.from}>`,
		to: [to],
		subject: "Reset Your Password",
		html,
		text,
	});

	if (error) {
		throw error;
	}
}

/**
 * Send hospital verification email
 */
async function sendHospitalVerificationEmail(
	data: SendHospitalVerificationEmailJobData,
): Promise<void> {
	const { to, hospitalName, verificationUrl, licenseNumber, adminEmail } = data;

	if (process.env.NODE_ENV === "test") {
		logger.info(
			{ to, hospitalName },
			"[TEST MODE] Hospital verification email not sent",
		);
		return;
	}

	const templateData = {
		hospitalName,
		licenseNumber: licenseNumber || "",
		adminEmail: adminEmail || to,
		verificationUrl,
		supportEmail: process.env.EMAIL_FROM || "support@usehely.com",
	};

	const html = getHospitalVerificationEmailHtml(templateData);
	const text = getHospitalVerificationEmailText(templateData);

	const { error } = await resend.emails.send({
		from: `${emailConfig.fromName} <${emailConfig.from}>`,
		to: [to],
		subject: "Verify Your Hospital Registration - useHely",
		html,
		text,
	});

	if (error) {
		throw error;
	}
}

/**
 * Send linked user notification email
 */
async function sendLinkedUserEmail(
	data: SendLinkedUserEmailJobData,
): Promise<void> {
	const { to, name, hospitalName, loginUrl } = data;

	if (process.env.NODE_ENV === "test") {
		logger.info({ to, name }, "[TEST MODE] Linked user email not sent");
		return;
	}

	const templateData = {
		firstName: name,
		hospitalName,
		loginUrl: loginUrl || `${process.env.BACKEND_URL}/login`,
	};

	const html = getLinkedUserEmailTemplate(templateData);
	const text = getLinkedUserEmailText(templateData);

	const { error } = await resend.emails.send({
		from: `${emailConfig.fromName} <${emailConfig.from}>`,
		to: [to],
		subject: `You've been added to ${hospitalName}`,
		html,
		text,
	});

	if (error) {
		throw error;
	}
}

/**
 * Process email jobs
 */
async function processEmailJob(job: Job): Promise<void> {
	logger.debug({ jobId: job.id, type: job.name }, "Processing email job");

	switch (job.name) {
		case EMAIL_JOB_TYPES.SEND_EMAIL:
			await sendGenericEmail(job.data as SendEmailJobData);
			break;
		case EMAIL_JOB_TYPES.SEND_WELCOME_EMAIL:
			await sendWelcomeEmail(job.data as SendWelcomeEmailJobData);
			break;
		case EMAIL_JOB_TYPES.SEND_PASSWORD_RESET_EMAIL:
			await sendPasswordResetEmail(job.data as SendPasswordResetEmailJobData);
			break;
		case EMAIL_JOB_TYPES.SEND_HOSPITAL_VERIFICATION_EMAIL:
			await sendHospitalVerificationEmail(
				job.data as SendHospitalVerificationEmailJobData,
			);
			break;
		case EMAIL_JOB_TYPES.SEND_LINKED_USER_EMAIL:
			await sendLinkedUserEmail(job.data as SendLinkedUserEmailJobData);
			break;
		default:
			throw new Error(`Unknown email job type: ${job.name}`);
	}

	logSuccess(logger, { jobId: job.id, type: job.name }, "Email job completed");
}

/**
 * Create and start the email worker
 */
export function createEmailWorker(): Worker {
	const connection = createRedisConnection();

	const worker = new Worker(QUEUE_NAMES.EMAIL, processEmailJob, {
		connection,
		concurrency: 5, // Process up to 5 emails concurrently
	});

	worker.on("completed", (job) => {
		logger.debug({ jobId: job.id }, "Email job completed");
	});

	worker.on("failed", (job, error) => {
		logError(logger, error, "Email job failed", { jobId: job?.id });
	});

	worker.on("error", (error) => {
		logError(logger, error, "Email worker error");
	});

	logger.info("Email worker started");
	return worker;
}
