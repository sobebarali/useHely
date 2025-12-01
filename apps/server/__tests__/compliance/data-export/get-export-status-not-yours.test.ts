import { DataSubjectRequest } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/compliance/data-export/:requestId - Not yours", () => {
	let context1: AuthTestContext;
	let context2: AuthTestContext;
	let accessToken2: string;
	let exportRequestId: string;

	beforeAll(async () => {
		// Create first user and their export request
		context1 = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens1 = await context1.issuePasswordTokens();

		const exportResponse = await request(app)
			.post("/api/compliance/data-export")
			.set("Authorization", `Bearer ${tokens1.accessToken}`)
			.send({
				format: "json",
				includeAuditLog: true,
			});

		exportRequestId = exportResponse.body.data.requestId;

		// Create second user
		context2 = await createAuthTestContext({
			rolePermissions: [],
		});
		const tokens2 = await context2.issuePasswordTokens();
		accessToken2 = tokens2.accessToken;
	}, 30000);

	afterAll(async () => {
		if (exportRequestId) {
			await DataSubjectRequest.deleteOne({ _id: exportRequestId });
		}
		await context1.cleanup();
		await context2.cleanup();
	});

	it("returns 403 when accessing another user's export request", async () => {
		const response = await request(app)
			.get(`/api/compliance/data-export/${exportRequestId}`)
			.set("Authorization", `Bearer ${accessToken2}`);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe("REQUEST_NOT_YOURS");
	});
});
