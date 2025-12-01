import { SecurityEvent } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import { cleanupSecurityEvents } from "../../helpers/security-test-helper";

describe("GET /api/security/keys/status - Unauthorized", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create test context WITHOUT SECURITY:READ permission
		context = await createAuthTestContext({
			roleName: "BASIC_USER",
			rolePermissions: ["PATIENT:READ"], // No SECURITY permissions
			createStaff: true,
		});

		// Get access token
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await cleanupSecurityEvents(context.hospitalId);
		await context.cleanup();
	});

	it("should return 403 error without SECURITY:READ permission", async () => {
		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("should include helpful message in error response", async () => {
		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toContain("SECURITY:READ");
	});

	it("should log PERMISSION_DENIED security event", async () => {
		// Make the request
		await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		// Wait a bit for async event logging
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Query directly for the security event
		const event = await SecurityEvent.findOne({
			type: "PERMISSION_DENIED",
			userId: context.userId,
		}).sort({ timestamp: -1 });

		expect(event).toBeDefined();
		expect(event?.type).toBe("PERMISSION_DENIED");
		expect(event?.severity).toBe("medium");
		expect(event?.userId).toBe(context.userId);
		expect(event?.details).toHaveProperty(
			"requiredPermission",
			"SECURITY:READ",
		);
	});
});
