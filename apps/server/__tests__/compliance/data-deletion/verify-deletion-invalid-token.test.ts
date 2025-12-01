import { DataSubjectRequest } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-deletion/:requestId/verify - Invalid token", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let deletionRequestId: string;

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
				reason: "Testing invalid token",
			});

		deletionRequestId = deletionResponse.body.data.requestId;
	}, 30000);

	afterAll(async () => {
		if (deletionRequestId) {
			await DataSubjectRequest.deleteOne({ _id: deletionRequestId });
		}
		await context.cleanup();
	});

	it("returns 400 for invalid verification token", async () => {
		const response = await request(app)
			.post(`/api/compliance/data-deletion/${deletionRequestId}/verify`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				token: "wrong-token-value",
			});

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("VERIFICATION_INVALID");
	});
});
