import { Hospital } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/hospitals/:id/status - Invalid status transition", () => {
	let authContext: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create auth context with TENANT:MANAGE permission
		authContext = await createAuthTestContext({
			roleName: "SUPER_ADMIN",
			rolePermissions: ["TENANT:READ", "TENANT:UPDATE", "TENANT:MANAGE"],
		});

		// Get access token
		const tokens = await authContext.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Set hospital to VERIFIED status to test invalid transition to PENDING
		await Hospital.findByIdAndUpdate(authContext.hospitalId, {
			status: "VERIFIED",
		});
	});

	afterAll(async () => {
		await authContext.cleanup();
	});

	it("should return 400 when trying to transition from VERIFIED to PENDING (invalid backward transition)", async () => {
		const statusUpdate = {
			status: "PENDING",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${authContext.hospitalId}/status`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(statusUpdate);

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("INVALID_TRANSITION");
		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toContain("VERIFIED");
		expect(response.body.message).toContain("PENDING");

		// Verify hospital status hasn't changed
		const hospital = await Hospital.findById(authContext.hospitalId);
		expect(hospital?.status).toBe("VERIFIED");
	});
});
