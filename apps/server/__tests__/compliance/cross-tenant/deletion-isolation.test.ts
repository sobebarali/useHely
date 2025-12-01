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

describe("Cross-Tenant Security - Data Deletion", () => {
	let tenantA: AuthTestContext;
	let tenantB: AuthTestContext;
	let tokenB: string;
	let deletionRequestIdA: string;
	const verificationToken = "test-verification-token-123";

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

		// Create deletion request for tenant A
		deletionRequestIdA = uuidv4();
		await DataSubjectRequest.create({
			_id: deletionRequestIdA,
			tenantId: tenantA.hospitalId,
			userId: tenantA.userId,
			userEmail: tenantA.email,
			type: DataSubjectRequestType.DELETION,
			status: DataSubjectRequestStatus.PENDING_VERIFICATION,
			verificationToken: verificationToken,
			verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 60000);

	afterAll(async () => {
		await DataSubjectRequest.deleteOne({ _id: deletionRequestIdA });
		await tenantA.cleanup();
		await tenantB.cleanup();
	});

	it("tenant B cannot get tenant A's deletion status", async () => {
		const response = await request(app)
			.get(`/api/compliance/data-deletion/${deletionRequestIdA}`)
			.set("Authorization", `Bearer ${tokenB}`);

		// Should return 404 - not found for different tenant
		expect(response.status).toBe(404);
		expect(response.body.code).toBeDefined();
	});

	it("tenant B cannot verify tenant A's deletion request", async () => {
		const response = await request(app)
			.post(`/api/compliance/data-deletion/${deletionRequestIdA}/verify`)
			.set("Authorization", `Bearer ${tokenB}`)
			.send({
				token: verificationToken,
			});

		// Should return 404 - not found for different tenant
		expect(response.status).toBe(404);
		expect(response.body.code).toBeDefined();
	});

	it("tenant B cannot cancel tenant A's deletion request", async () => {
		const response = await request(app)
			.post(`/api/compliance/data-deletion/${deletionRequestIdA}/cancel`)
			.set("Authorization", `Bearer ${tokenB}`)
			.send({
				reason: "Cross-tenant attack attempt",
			});

		// Should return 404 - not found for different tenant
		expect(response.status).toBe(404);
		expect(response.body.code).toBeDefined();
	});
});
