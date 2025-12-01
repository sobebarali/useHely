import { DataSubjectRequest, DataSubjectRequestStatus } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("PUT /api/compliance/requests/:requestId/process - Approve request", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let requestId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["COMPLIANCE:MANAGE"],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a pending request to approve
		requestId = uuidv4();
		await DataSubjectRequest.create({
			_id: requestId,
			tenantId: context.hospitalId,
			userId: context.userId,
			userEmail: context.email,
			type: "export",
			status: DataSubjectRequestStatus.PENDING,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await DataSubjectRequest.deleteOne({ _id: requestId });
		await context.cleanup();
	});

	it("approves a pending request with COMPLIANCE:MANAGE permission", async () => {
		const response = await request(app)
			.put(`/api/compliance/requests/${requestId}/process`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				action: "approve",
				notes: "Approved by admin for testing",
			});

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeDefined();
		expect(response.body.data.requestId).toBe(requestId);
		expect(response.body.data.status).toBe(DataSubjectRequestStatus.PROCESSING);
		expect(response.body.data.processedBy).toBe(context.userId);
		expect(response.body.data.processedAt).toBeDefined();

		// Verify database state
		const updatedRequest = await DataSubjectRequest.findById(requestId);
		expect(updatedRequest?.status).toBe(DataSubjectRequestStatus.PROCESSING);
	});
});
