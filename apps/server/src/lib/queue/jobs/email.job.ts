/**
 * Email Job Definitions
 *
 * Type definitions and helpers for email background jobs
 */

import { emailQueue } from "../queues";

// Job types
export const EMAIL_JOB_TYPES = {
	SEND_EMAIL: "send-email",
	SEND_WELCOME_EMAIL: "send-welcome-email",
	SEND_PASSWORD_RESET_EMAIL: "send-password-reset-email",
	SEND_HOSPITAL_VERIFICATION_EMAIL: "send-hospital-verification-email",
	SEND_LINKED_USER_EMAIL: "send-linked-user-email",
} as const;

export type EmailJobType =
	(typeof EMAIL_JOB_TYPES)[keyof typeof EMAIL_JOB_TYPES];

// Job data types
export interface SendEmailJobData {
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
	category?: string;
}

export interface SendWelcomeEmailJobData {
	to: string;
	name: string;
	temporaryPassword: string;
	hospitalName: string;
	loginUrl?: string;
}

export interface SendPasswordResetEmailJobData {
	to: string;
	name: string;
	resetToken: string;
	resetUrl: string;
	expiresInMinutes: number;
}

export interface SendHospitalVerificationEmailJobData {
	to: string;
	hospitalName: string;
	verificationToken: string;
	verificationUrl: string;
	licenseNumber?: string;
	adminEmail?: string;
}

export interface SendLinkedUserEmailJobData {
	to: string;
	name: string;
	linkedByName: string;
	hospitalName: string;
	temporaryPassword: string;
	loginUrl?: string;
}

// Job enqueueing helpers
export async function enqueueEmail(data: SendEmailJobData): Promise<string> {
	const job = await emailQueue.add(EMAIL_JOB_TYPES.SEND_EMAIL, data, {
		priority: 1, // High priority for general emails
	});
	return job.id ?? "";
}

export async function enqueueWelcomeEmail(
	data: SendWelcomeEmailJobData,
): Promise<string> {
	const job = await emailQueue.add(EMAIL_JOB_TYPES.SEND_WELCOME_EMAIL, data, {
		priority: 2,
	});
	return job.id ?? "";
}

export async function enqueuePasswordResetEmail(
	data: SendPasswordResetEmailJobData,
): Promise<string> {
	const job = await emailQueue.add(
		EMAIL_JOB_TYPES.SEND_PASSWORD_RESET_EMAIL,
		data,
		{
			priority: 1, // High priority - time sensitive
		},
	);
	return job.id ?? "";
}

export async function enqueueHospitalVerificationEmail(
	data: SendHospitalVerificationEmailJobData,
): Promise<string> {
	const job = await emailQueue.add(
		EMAIL_JOB_TYPES.SEND_HOSPITAL_VERIFICATION_EMAIL,
		data,
		{
			priority: 1,
		},
	);
	return job.id ?? "";
}

export async function enqueueLinkedUserEmail(
	data: SendLinkedUserEmailJobData,
): Promise<string> {
	const job = await emailQueue.add(
		EMAIL_JOB_TYPES.SEND_LINKED_USER_EMAIL,
		data,
		{
			priority: 2,
		},
	);
	return job.id ?? "";
}
