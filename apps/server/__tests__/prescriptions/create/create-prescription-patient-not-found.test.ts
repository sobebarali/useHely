import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/prescriptions - Patient not found", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PRESCRIPTION:CREATE"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 404 when patient does not exist", async () => {
		const nonExistentPatientId = uuidv4();

		const payload = {
			patientId: nonExistentPatientId,
			diagnosis: "Test diagnosis",
			medicines: [
				{
					name: "Test Medicine",
					dosage: "100mg",
					frequency: "Once daily",
					duration: "5 days",
				},
			],
		};

		const response = await request(app)
			.post("/api/prescriptions")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(404);
		expect(response.body.code).toBe("PATIENT_NOT_FOUND");
		expect(response.body.message).toBe("Patient not found");
	});
});
