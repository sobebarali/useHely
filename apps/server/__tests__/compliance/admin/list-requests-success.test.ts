import { DataSubjectRequest, DataSubjectRequestStatus } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/compliance/requests - List requests success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdRequestIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["COMPLIANCE:READ"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test data subject requests
		const exportRequest = await DataSubjectRequest.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			userId: context.userId,
			userEmail: context.email,
			type: "export",
			status: DataSubjectRequestStatus.PENDING,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		createdRequestIds.push(String(exportRequest._id));

		const deletionRequest = await DataSubjectRequest.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			userId: context.userId,
			userEmail: context.email,
			type: "deletion",
			status: DataSubjectRequestStatus.PENDING_VERIFICATION,
			verificationToken: "test-token-123",
			verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		createdRequestIds.push(String(deletionRequest._id));
	}, 30000);

	afterAll(async () => {
		for (const requestId of createdRequestIds) {
			await DataSubjectRequest.deleteOne({ _id: requestId });
		}
		await context.cleanup();
	});

	it("returns all requests with COMPLIANCE:READ permission", async () => {
		const response = await request(app)
			.get("/api/compliance/requests")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBeGreaterThanOrEqual(2);
		expect(response.body.pagination).toBeDefined();
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(20);
	});

	it("filters requests by type=export", async () => {
		const response = await request(app)
			.get("/api/compliance/requests?type=export")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBeGreaterThanOrEqual(1);

		for (const req of response.body.data) {
			expect(req.type).toBe("export");
		}
	});

	it("filters requests by type=deletion", async () => {
		const response = await request(app)
			.get("/api/compliance/requests?type=deletion")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBeGreaterThanOrEqual(1);

		for (const req of response.body.data) {
			expect(req.type).toBe("deletion");
		}
	});

	it("filters requests by status", async () => {
		const response = await request(app)
			.get(
				`/api/compliance/requests?status=${DataSubjectRequestStatus.PENDING}`,
			)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeInstanceOf(Array);

		for (const req of response.body.data) {
			expect(req.status).toBe(DataSubjectRequestStatus.PENDING);
		}
	});

	it("supports pagination", async () => {
		const response = await request(app)
			.get("/api/compliance/requests?page=1&limit=1")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.data.length).toBeLessThanOrEqual(1);
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(1);
	});

	it("returns correct data structure for requests", async () => {
		const response = await request(app)
			.get("/api/compliance/requests")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		const req = response.body.data[0];

		expect(req).toHaveProperty("requestId");
		expect(req).toHaveProperty("type");
		expect(req).toHaveProperty("userId");
		expect(req).toHaveProperty("userEmail");
		expect(req).toHaveProperty("status");
		expect(req).toHaveProperty("createdAt");
	});
});
