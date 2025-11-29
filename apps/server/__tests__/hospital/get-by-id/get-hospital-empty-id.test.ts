import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/hospitals/:id - Empty or whitespace ID", () => {
	let authContext: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create auth context with TENANT:READ permission
		authContext = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["TENANT:READ"],
		});

		// Get access token
		const tokens = await authContext.issuePasswordTokens();
		accessToken = tokens.accessToken;
	});

	afterAll(async () => {
		await authContext.cleanup();
	});

	it("should return 404 for single space as ID", async () => {
		const spaceId = " ";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(spaceId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should return 404 for multiple spaces as ID", async () => {
		const spacesId = "   ";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(spacesId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should return 404 for tab character as ID", async () => {
		const tabId = "\t";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(tabId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});

	it("should return 404 for newline character as ID", async () => {
		const newlineId = "\n";

		const response = await request(app)
			.get(`/api/hospitals/${encodeURIComponent(newlineId)}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
	});
});
