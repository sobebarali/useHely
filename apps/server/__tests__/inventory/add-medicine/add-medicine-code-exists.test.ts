import { Medicine } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/medicines - Add medicine code exists", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const existingCode = `EXISTING-${Date.now()}`;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:CREATE", "INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create a medicine with the existing code
		await Medicine.create({
			_id: uuidv4(),
			tenantId: context.hospitalId,
			name: "Existing Medicine",
			genericName: "Existing Generic",
			code: existingCode,
			category: "ANALGESICS",
			type: "TABLET",
			unit: "tablets",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("returns 409 when medicine code already exists", async () => {
		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({
				name: "New Medicine",
				genericName: "New Generic",
				code: existingCode,
				category: "ANTIBIOTICS",
				type: "CAPSULE",
				unit: "capsules",
			});

		expect(response.status).toBe(409);
	});
});
