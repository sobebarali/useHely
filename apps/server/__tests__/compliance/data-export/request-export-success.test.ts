import { DataSubjectRequest } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/compliance/data-export - Request export success", () => {
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

	it("creates a data export request successfully", async () => {
		const payload = {
			format: "json",
			includeAuditLog: true,
		};

		const response = await request(app)
			.post("/api/compliance/data-export")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(202);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("requestId");
		expect(response.body.data.type).toBe("EXPORT");
		expect(response.body.data.format).toBe("json");
		expect(response.body.data).toHaveProperty("createdAt");
		expect(response.body.data).toHaveProperty("estimatedCompletion");

		createdRequestId = response.body.data.requestId;

		// Verify request was created in database
		const req = await DataSubjectRequest.findById(createdRequestId);
		expect(req).not.toBeNull();
		expect(req?.type).toBe("EXPORT");
		expect(req?.userId).toBe(context.userId);
	});

	it("allows new export request after previous completes", async () => {
		// Note: In our implementation, exports are processed synchronously for simplicity
		// The previous request completed immediately, so a new request is allowed
		// In production with async processing, this would reject with 409 EXPORT_PENDING
		const payload = {
			format: "csv", // Different format to distinguish
			includeAuditLog: false,
		};

		const response = await request(app)
			.post("/api/compliance/data-export")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(202);
		expect(response.body.success).toBe(true);
		expect(response.body.data.format).toBe("csv");

		// Cleanup the second request
		await DataSubjectRequest.deleteOne({ _id: response.body.data.requestId });
	});
});
