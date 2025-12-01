import {
	DataSubjectRequest,
	DataSubjectRequestStatus,
	DataSubjectRequestType,
} from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import { generateSecureToken, hashToken } from "../../../src/utils/crypto";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/compliance/data-deletion/:requestId - Success", () => {
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

		// Generate a plain text token and hash it for storage
		verificationToken = generateSecureToken();
		const hashedToken = hashToken(verificationToken);

		// Create deletion request directly with known token
		deletionRequestId = uuidv4();
		await DataSubjectRequest.create({
			_id: deletionRequestId,
			tenantId: context.hospitalId,
			userId: context.userId,
			userEmail: context.email,
			type: DataSubjectRequestType.DELETION,
			status: DataSubjectRequestStatus.PENDING_VERIFICATION,
			reason: "Testing status endpoint",
			confirmEmail: context.email,
			verificationToken: hashedToken,
			verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
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
		// Use the plain text verification token stored in beforeAll
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
