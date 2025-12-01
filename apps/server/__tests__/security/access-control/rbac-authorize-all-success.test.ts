import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import { cleanupSecurityEvents } from "../../helpers/security-test-helper";

describe("RBAC Authorization - All Permissions (AND Logic)", () => {
	let fullAccessContext: AuthTestContext;
	let partialAccessContext: AuthTestContext;

	beforeAll(async () => {
		// Context with both SECURITY:READ and SECURITY:MANAGE permissions
		fullAccessContext = await createAuthTestContext({
			roleName: "SECURITY_ADMIN",
			rolePermissions: ["SECURITY:READ", "SECURITY:MANAGE"],
			createStaff: true,
		});

		// Context with only SECURITY:READ (missing SECURITY:MANAGE)
		partialAccessContext = await createAuthTestContext({
			roleName: "SECURITY_VIEWER",
			rolePermissions: ["SECURITY:READ"],
			createStaff: true,
		});
	}, 30000);

	afterAll(async () => {
		await cleanupSecurityEvents(fullAccessContext.hospitalId);
		await cleanupSecurityEvents(partialAccessContext.hospitalId);
		await fullAccessContext.cleanup();
		await partialAccessContext.cleanup();
	});

	it("should allow access when user has all required permissions (AND logic)", async () => {
		const tokens = await fullAccessContext.issuePasswordTokens();

		// User has both SECURITY:READ and SECURITY:MANAGE
		// Should be able to rotate keys (requires SECURITY:MANAGE)
		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${tokens.accessToken}`);

		expect(response.status).toBe(200);
	});

	it("should deny access when user is missing any required permission", async () => {
		const tokens = await partialAccessContext.issuePasswordTokens();

		// User has SECURITY:READ but not SECURITY:MANAGE
		// Should NOT be able to rotate keys
		const response = await request(app)
			.post("/api/security/keys/rotate")
			.set("Authorization", `Bearer ${tokens.accessToken}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("PERMISSION_DENIED");
	});

	it("should allow access to endpoints requiring single permission", async () => {
		const tokens = await partialAccessContext.issuePasswordTokens();

		// User has SECURITY:READ - should be able to read events
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${tokens.accessToken}`);

		expect(response.status).toBe(200);
	});

	it("should verify full access context can perform all operations", async () => {
		const tokens = await fullAccessContext.issuePasswordTokens();

		// Read events (SECURITY:READ)
		const readResponse = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${tokens.accessToken}`);

		expect(readResponse.status).toBe(200);

		// Get key status (SECURITY:READ)
		const statusResponse = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${tokens.accessToken}`);

		expect(statusResponse.status).toBe(200);
	});
});
