import { Staff } from "@hms/db";
import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/users/change-password - Password reuse", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["USER:READ"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Add current password to password history
		const hashedPassword = await bcrypt.hash(context.password, 10);
		await Staff.findByIdAndUpdate(context.staffId, {
			$push: {
				passwordHistory: {
					$each: [hashedPassword],
					$slice: -3,
				},
			},
		});
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when trying to reuse a recent password", async () => {
		const payload = {
			currentPassword: context.password,
			newPassword: context.password, // Same as current password
			confirmPassword: context.password,
		};

		const response = await request(app)
			.post("/api/users/change-password")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("PASSWORD_REUSE");
		expect(response.body.message).toContain("Cannot reuse");
	});
});
