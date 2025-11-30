import { Staff } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/users/change-password - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const newPassword = "NewSecurePass123!";

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["USER:READ"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("changes password successfully when current password is correct", async () => {
		const payload = {
			currentPassword: context.password,
			newPassword,
			confirmPassword: newPassword,
		};

		const response = await request(app)
			.post("/api/users/change-password")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(200);
		expect(response.body.message).toContain(
			"Password has been changed successfully",
		);

		// Verify password was updated - login with new password should work
		const loginResponse = await request(app).post("/api/auth/token").send({
			grant_type: "password",
			username: context.email,
			password: newPassword,
			tenant_id: context.hospitalId,
		});

		expect(loginResponse.status).toBe(200);
		expect(loginResponse.body.access_token).toBeDefined();

		// Verify staff status is ACTIVE (in case it was PASSWORD_EXPIRED)
		const staff = await Staff.findById(context.staffId);
		expect(staff?.status).toBe("ACTIVE");
	});
});
