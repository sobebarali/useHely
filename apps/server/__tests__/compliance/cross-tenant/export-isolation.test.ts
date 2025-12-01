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

describe("Cross-Tenant Security - Data Export", () => {
	let tenantA: AuthTestContext;
	let tenantB: AuthTestContext;
	let tokenB: string;
	let exportRequestIdA: string;

	beforeAll(async () => {
		// Create two separate tenants
		tenantA = await createAuthTestContext({
			rolePermissions: [],
		});
		tenantB = await createAuthTestContext({
			rolePermissions: [],
		});

		await tenantA.issuePasswordTokens();
		const tokensB = await tenantB.issuePasswordTokens();
		tokenB = tokensB.accessToken;

		// Create export request for tenant A
		exportRequestIdA = uuidv4();
		await DataSubjectRequest.create({
			_id: exportRequestIdA,
			tenantId: tenantA.hospitalId,
			userId: tenantA.userId,
			userEmail: tenantA.email,
			type: DataSubjectRequestType.EXPORT,
			status: DataSubjectRequestStatus.COMPLETED,
			exportData: { test: "data" },
			completedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 60000);

	afterAll(async () => {
		await DataSubjectRequest.deleteOne({ _id: exportRequestIdA });
		await tenantA.cleanup();
		await tenantB.cleanup();
	});

	it("tenant B cannot access tenant A's export status", async () => {
		const response = await request(app)
			.get(`/api/compliance/data-export/${exportRequestIdA}`)
			.set("Authorization", `Bearer ${tokenB}`);

		// Should return 404 - not found for different tenant
		expect(response.status).toBe(404);
		expect(response.body.code).toBeDefined();
	});

	it("tenant B cannot download tenant A's export", async () => {
		const response = await request(app)
			.get(`/api/compliance/data-export/${exportRequestIdA}/download`)
			.set("Authorization", `Bearer ${tokenB}`);

		// Should return 404 - not found for different tenant
		expect(response.status).toBe(404);
		expect(response.body.code).toBeDefined();
	});
});
