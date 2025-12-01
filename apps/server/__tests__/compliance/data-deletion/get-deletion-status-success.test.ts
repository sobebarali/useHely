import { DataSubjectRequest } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/compliance/data-deletion/:requestId - Success", () => {
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
				reason: "Testing status endpoint",
			});

		deletionRequestId = deletionResponse.body.data.requestId;
	}, 30000);

	afterAll(async () => {
		if (deletionRequestId) {
			await DataSubjectRequest.deleteOne({ _id: deletionRequestId });
		}
		await context.cleanup();
	});

	it("returns deletion status successfully", async () => {
		const response = await request(app)
			.get(`/api/compliance/data-deletion/${deletionRequestId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("requestId", deletionRequestId);
		expect(response.body.data).toHaveProperty("type", "DELETION");
		expect(response.body.data).toHaveProperty("status", "PENDING_VERIFICATION");
	});

	it("returns verified status after verification", async () => {
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

		const response = await request(app)
			.get(`/api/compliance/data-deletion/${deletionRequestId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.status).toBe("VERIFIED");
		expect(response.body.data).toHaveProperty("gracePeriodEnds");
	});
});
