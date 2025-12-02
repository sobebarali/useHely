import { Staff, User } from "@hms/db";
import speakeasy from "speakeasy";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import { cleanupSecurityEventsForUser } from "../../helpers/security-test-helper";

describe("POST /api/auth/token (grant_type: mfa) - User Status Change During Flow", () => {
	let context: AuthTestContext;
	let totpSecret: string;

	beforeAll(async () => {
		// Create test context
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["ROLE:READ"],
			createStaff: true,
		});

		// Get access token to enable MFA
		const tokens = await context.issuePasswordTokens();
		const accessToken = tokens.accessToken;

		// Enable MFA
		const enableResponse = await request(app)
			.post("/api/auth/mfa/enable")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(enableResponse.status).toBe(200);
		totpSecret = enableResponse.body.data.secret;

		// Verify MFA to fully enable it
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		const verifyResponse = await request(app)
			.post("/api/auth/mfa/verify")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ code: validCode });

		expect(verifyResponse.status).toBe(200);
		expect(verifyResponse.body.data.enabled).toBe(true);
	}, 30000);

	afterAll(async () => {
		// Clean up security events
		await cleanupSecurityEventsForUser(context.userId);

		// Restore staff status to active for cleanup
		await Staff.findOneAndUpdate(
			{ userId: context.userId },
			{ $set: { status: "ACTIVE" } },
		);

		// Clear MFA config before cleanup
		await User.findByIdAndUpdate(context.userId, {
			$unset: { mfaConfig: 1 },
		});

		await context.cleanup();
	});

	it("should reject MFA completion if staff status changes to LOCKED during flow", async () => {
		// Get MFA challenge first
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse.status).toBe(200);
		expect(challengeResponse.body.mfa_required).toBe(true);
		const challengeToken = challengeResponse.body.challenge_token;

		// Lock the staff account while MFA challenge is pending
		await Staff.findOneAndUpdate(
			{ userId: context.userId, tenantId: context.hospitalId },
			{ $set: { status: "LOCKED" } },
		);

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Try to complete MFA - should fail because account is now locked
		const mfaResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(mfaResponse.status).toBe(403);
		expect(mfaResponse.body.code).toBe("ACCOUNT_LOCKED");

		// Restore status for subsequent tests
		await Staff.findOneAndUpdate(
			{ userId: context.userId, tenantId: context.hospitalId },
			{ $set: { status: "ACTIVE" } },
		);
	});

	it("should reject MFA completion if staff status changes to INACTIVE during flow", async () => {
		// Get MFA challenge first
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse.status).toBe(200);
		expect(challengeResponse.body.mfa_required).toBe(true);
		const challengeToken = challengeResponse.body.challenge_token;

		// Set staff to inactive while MFA challenge is pending
		await Staff.findOneAndUpdate(
			{ userId: context.userId, tenantId: context.hospitalId },
			{ $set: { status: "INACTIVE" } },
		);

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Try to complete MFA - should fail because account is inactive
		const mfaResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(mfaResponse.status).toBe(403);
		expect(mfaResponse.body.code).toBe("ACCOUNT_LOCKED");

		// Restore status for subsequent tests
		await Staff.findOneAndUpdate(
			{ userId: context.userId, tenantId: context.hospitalId },
			{ $set: { status: "ACTIVE" } },
		);
	});

	it("should reject MFA completion if staff status changes to PASSWORD_EXPIRED during flow", async () => {
		// Get MFA challenge first
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse.status).toBe(200);
		expect(challengeResponse.body.mfa_required).toBe(true);
		const challengeToken = challengeResponse.body.challenge_token;

		// Set staff to password expired while MFA challenge is pending
		await Staff.findOneAndUpdate(
			{ userId: context.userId, tenantId: context.hospitalId },
			{ $set: { status: "PASSWORD_EXPIRED" } },
		);

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Try to complete MFA - should fail because password is expired
		const mfaResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(mfaResponse.status).toBe(403);
		expect(mfaResponse.body.code).toBe("PASSWORD_EXPIRED");

		// Restore status for subsequent tests
		await Staff.findOneAndUpdate(
			{ userId: context.userId, tenantId: context.hospitalId },
			{ $set: { status: "ACTIVE" } },
		);
	});

	it("should reject MFA completion if staff is disassociated from tenant during flow", async () => {
		// Get MFA challenge first
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse.status).toBe(200);
		expect(challengeResponse.body.mfa_required).toBe(true);
		const challengeToken = challengeResponse.body.challenge_token;

		// Store original tenantId to restore later
		const staff = await Staff.findOne({
			userId: context.userId,
			tenantId: context.hospitalId,
		}).lean();
		const originalStaffId = staff?._id;

		// Temporarily delete the staff record (disassociate from tenant)
		await Staff.findOneAndDelete({
			userId: context.userId,
			tenantId: context.hospitalId,
		});

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Try to complete MFA - should fail because user is no longer associated with tenant
		const mfaResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(mfaResponse.status).toBe(403);
		expect(mfaResponse.body.code).toBe("TENANT_INACTIVE");

		// Restore staff record
		if (staff) {
			await Staff.create({
				...staff,
				_id: originalStaffId,
			});
		}
	});

	it("should still allow MFA completion if status remains ACTIVE", async () => {
		// Ensure staff is active
		await Staff.findOneAndUpdate(
			{ userId: context.userId, tenantId: context.hospitalId },
			{ $set: { status: "ACTIVE" } },
		);

		// Get MFA challenge first
		const challengeResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: context.password,
			tenant_id: context.hospitalId,
		});

		expect(challengeResponse.status).toBe(200);
		expect(challengeResponse.body.mfa_required).toBe(true);
		const challengeToken = challengeResponse.body.challenge_token;

		// Generate valid TOTP code
		const validCode = speakeasy.totp({
			secret: totpSecret,
			encoding: "base32",
		});

		// Complete MFA - should succeed
		const mfaResponse = await request(app).post("/api/auth/token").send({
			grant_type: "mfa",
			challenge_token: challengeToken,
			code: validCode,
		});

		expect(mfaResponse.status).toBe(200);
		expect(mfaResponse.body).toHaveProperty("access_token");
		expect(mfaResponse.body).toHaveProperty("refresh_token");
	});
});
