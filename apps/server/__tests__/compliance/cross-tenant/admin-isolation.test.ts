import {
	DataSubjectRequest,
	DataSubjectRequestStatus,
	DataSubjectRequestType,
} from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("Cross-Tenant Security - Admin Operations", () => {
	let tenantA: AuthTestContext;
	let tenantB: AuthTestContext;
	let tokenA: string;
	let tokenB: string;
	let requestIdA: string;

	beforeAll(async () => {
		// Create two separate tenants with admin permissions
		tenantA = await createAuthTestContext({
			rolePermissions: ["COMPLIANCE:READ", "COMPLIANCE:MANAGE"],
		});
		tenantB = await createAuthTestContext({
			rolePermissions: ["COMPLIANCE:READ", "COMPLIANCE:MANAGE"],
		});

		const tokensA = await tenantA.issuePasswordTokens();
		const tokensB = await tenantB.issuePasswordTokens();
		tokenA = tokensA.accessToken;
		tokenB = tokensB.accessToken;

		// Create data subject request for tenant A
		requestIdA = uuidv4();
		await DataSubjectRequest.create({
			_id: requestIdA,
			tenantId: tenantA.hospitalId,
			userId: tenantA.userId,
			userEmail: tenantA.email,
			type: DataSubjectRequestType.EXPORT,
			status: DataSubjectRequestStatus.PENDING,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 60000);

	afterAll(async () => {
		await DataSubjectRequest.deleteOne({ _id: requestIdA });
		await tenantA.cleanup();
		await tenantB.cleanup();
	});

	it("tenant B admin cannot see tenant A's requests in list", async () => {
		const response = await request(app)
			.get("/api/compliance/requests")
			.set("Authorization", `Bearer ${tokenB}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// Tenant B admin should not see tenant A's requests
		const requestIds = response.body.data.map(
			(r: { requestId: string }) => r.requestId,
		);
		expect(requestIds).not.toContain(requestIdA);
	});

	it("tenant B admin cannot process tenant A's request", async () => {
		const response = await request(app)
			.put(`/api/compliance/requests/${requestIdA}/process`)
			.set("Authorization", `Bearer ${tokenB}`)
			.send({
				action: "approve",
				notes: "Cross-tenant attack attempt",
			});

		// Should return 404 - not found for different tenant
		expect(response.status).toBe(404);
		expect(response.body.code).toBeDefined();
	});

	it("tenant A admin can see their own requests", async () => {
		const response = await request(app)
			.get("/api/compliance/requests")
			.set("Authorization", `Bearer ${tokenA}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// Tenant A admin should see their own request
		const requestIds = response.body.data.map(
			(r: { requestId: string }) => r.requestId,
		);
		expect(requestIds).toContain(requestIdA);
	});

	it("tenant A admin can process their own request", async () => {
		const response = await request(app)
			.put(`/api/compliance/requests/${requestIdA}/process`)
			.set("Authorization", `Bearer ${tokenA}`)
			.send({
				action: "approve",
				notes: "Approved by tenant A admin",
			});

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.requestId).toBe(requestIdA);
	});
});
