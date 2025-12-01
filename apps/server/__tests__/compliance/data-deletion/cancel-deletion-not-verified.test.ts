import { DataSubjectRequest } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-deletion/:requestId/cancel - Not verified", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let deletionRequestId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a deletion request but don't verify it
		const deletionResponse = await request(app)
			.post("/api/compliance/data-deletion")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				confirmEmail: context.email,
				reason: "Testing not verified cancel",
			});

		deletionRequestId = deletionResponse.body.data.requestId;
	}, 30000);

	afterAll(async () => {
		if (deletionRequestId) {
			await DataSubjectRequest.deleteOne({ _id: deletionRequestId });
		}
		await context.cleanup();
	});

	it("allows cancellation of unverified request", async () => {
		const response = await request(app)
			.post(`/api/compliance/data-deletion/${deletionRequestId}/cancel`)
			.set("Authorization", `Bearer ${accessToken}`);

		// Cancellation is allowed at any stage (PENDING_VERIFICATION or VERIFIED)
		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.status).toBe("CANCELLED");
	});
});
