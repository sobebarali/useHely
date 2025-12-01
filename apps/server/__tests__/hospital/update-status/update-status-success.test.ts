import { Hospital } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PATCH /api/hospitals/:id/status - Successfully update hospital status from VERIFIED to ACTIVE", () => {
	let authContext: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create auth context with TENANT:MANAGE permission (required for status updates)
		authContext = await createAuthTestContext({
			roleName: "SUPER_ADMIN",
			rolePermissions: ["TENANT:READ", "TENANT:UPDATE", "TENANT:MANAGE"],
		});

		// Get access token
		const tokens = await authContext.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Update hospital status to VERIFIED
		await Hospital.findByIdAndUpdate(authContext.hospitalId, {
			status: "VERIFIED",
		});
	}, 30000);

	afterAll(async () => {
		await authContext.cleanup();
	});

	it("should successfully update hospital status from VERIFIED to ACTIVE", async () => {
		const statusUpdate = {
			status: "ACTIVE",
			reason: "Hospital verification completed",
		};

		const response = await request(app)
			.patch(`/api/hospitals/${authContext.hospitalId}/status`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(statusUpdate);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("id");
		expect(response.body.id).toBe(authContext.hospitalId);
		expect(response.body.status).toBe("ACTIVE");
		expect(response.body).toHaveProperty("updatedAt");

		// Verify database entry
		const hospital = await Hospital.findById(authContext.hospitalId);
		expect(hospital).toBeDefined();
		expect(hospital?.status).toBe("ACTIVE");
	});
});
