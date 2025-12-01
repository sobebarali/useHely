import { DataSubjectRequest } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-deletion/:requestId/cancel - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let deletionRequestId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create and verify a deletion request
		const deletionResponse = await request(app)
			.post("/api/compliance/data-deletion")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				confirmEmail: context.email,
				reason: "Testing cancel flow",
			});

		deletionRequestId = deletionResponse.body.data.requestId;

		// Get the verification token and verify the request
		const deletionRequest =
			await DataSubjectRequest.findById(deletionRequestId);
		const verificationToken = deletionRequest?.verificationToken || "";

		await request(app)
			.post(`/api/compliance/data-deletion/${deletionRequestId}/verify`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				token: verificationToken,
			});
	}, 30000);

	afterAll(async () => {
		if (deletionRequestId) {
			await DataSubjectRequest.deleteOne({ _id: deletionRequestId });
		}
		await context.cleanup();
	});

	it("cancels deletion request during grace period", async () => {
		const response = await request(app)
			.post(`/api/compliance/data-deletion/${deletionRequestId}/cancel`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("requestId", deletionRequestId);
		expect(response.body.data).toHaveProperty("status", "CANCELLED");
		expect(response.body.data).toHaveProperty("message");
	});

	it("verifies database is updated correctly", async () => {
		const deletionRequest =
			await DataSubjectRequest.findById(deletionRequestId);

		expect(deletionRequest).not.toBeNull();
		expect(deletionRequest?.status).toBe("CANCELLED");
	});
});
