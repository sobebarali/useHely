import { DataSubjectRequest } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-deletion/:requestId/verify - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let deletionRequestId: string;
	let verificationToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a deletion request
		const deletionResponse = await request(app)
			.post("/api/compliance/data-deletion")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				confirmEmail: context.email,
				reason: "Testing verification flow",
			});

		deletionRequestId = deletionResponse.body.data.requestId;

		// Get the verification token from the database
		const deletionRequest =
			await DataSubjectRequest.findById(deletionRequestId);
		verificationToken = deletionRequest?.verificationToken || "";
	}, 30000);

	afterAll(async () => {
		if (deletionRequestId) {
			await DataSubjectRequest.deleteOne({ _id: deletionRequestId });
		}
		await context.cleanup();
	});

	it("verifies deletion request with valid token", async () => {
		const response = await request(app)
			.post(`/api/compliance/data-deletion/${deletionRequestId}/verify`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				token: verificationToken,
			});

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("requestId", deletionRequestId);
		expect(response.body.data).toHaveProperty("status", "VERIFIED");
		expect(response.body.data).toHaveProperty("scheduledDeletion");
		expect(response.body.data).toHaveProperty("message");
	});

	it("verifies database is updated correctly", async () => {
		const deletionRequest =
			await DataSubjectRequest.findById(deletionRequestId);

		expect(deletionRequest).not.toBeNull();
		expect(deletionRequest?.status).toBe("VERIFIED");
		expect(deletionRequest?.verifiedAt).toBeTruthy();
		expect(deletionRequest?.gracePeriodEnds).toBeTruthy();
	});
});
