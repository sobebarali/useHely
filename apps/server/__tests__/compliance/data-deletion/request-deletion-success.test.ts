import { DataSubjectRequest } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-deletion - Request deletion success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let createdRequestId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: [], // No special permissions needed for own data
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		if (createdRequestId) {
			await DataSubjectRequest.deleteOne({ _id: createdRequestId });
		}
		await context.cleanup();
	});

	it("creates a data deletion request successfully", async () => {
		const payload = {
			confirmEmail: context.email,
			reason: "No longer using the service",
		};

		const response = await request(app)
			.post("/api/compliance/data-deletion")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(202);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("requestId");
		expect(response.body.data.type).toBe("DELETION");
		expect(response.body.data.status).toBe("PENDING_VERIFICATION");
		expect(response.body.data).toHaveProperty("message");
		expect(response.body.data.message).toContain("Verification");

		createdRequestId = response.body.data.requestId;

		// Verify request was created in database
		const req = await DataSubjectRequest.findById(createdRequestId);
		expect(req).not.toBeNull();
		expect(req?.type).toBe("DELETION");
		expect(req?.status).toBe("PENDING_VERIFICATION");
		expect(req?.verificationToken).toBeTruthy();
	});

	it("rejects request with mismatched email", async () => {
		// First, cancel the existing request so we can test email mismatch
		await DataSubjectRequest.deleteOne({ _id: createdRequestId });
		createdRequestId = "";

		const payload = {
			confirmEmail: "wrong@email.com",
			reason: "No longer using the service",
		};

		const response = await request(app)
			.post("/api/compliance/data-deletion")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("EMAIL_MISMATCH");
	});
});
