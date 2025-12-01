import { SecurityEvent } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import { cleanupSecurityEvents } from "../../helpers/security-test-helper";

describe("RBAC Authorization - Insufficient Permission", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create test context with unrelated permissions
		context = await createAuthTestContext({
			roleName: "LIMITED_USER",
			rolePermissions: ["ROLE:READ", "DEPARTMENT:READ"],
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

	it("should return 403 response for missing permission", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
	});

	it("should return PERMISSION_DENIED error code", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.body).toHaveProperty("code");
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("should log PERMISSION_DENIED security event", async () => {
		// Make the denied request
		await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		// Wait for async event logging
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check for security event
		const event = await SecurityEvent.findOne({
			type: "PERMISSION_DENIED",
			userId: context.userId,
		}).sort({ timestamp: -1 });

		expect(event).toBeDefined();
		expect(event?.type).toBe("PERMISSION_DENIED");
		expect(event?.severity).toBe("medium");
	});

	it("should include required permission in error details", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toContain("SECURITY:READ");
	});

	it("should deny access to patient endpoints without PATIENT permission", async () => {
		const response = await request(app)
			.get("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("should deny access to key rotation without SECURITY:MANAGE", async () => {
		const response = await request(app)
			.post("/api/security/keys/rotate")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});
});
