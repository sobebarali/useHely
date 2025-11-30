import { Medicine } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/inventory/medicines - Add medicine success", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["INVENTORY:CREATE", "INVENTORY:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await Medicine.deleteMany({ tenantId: context.hospitalId });
		await context.cleanup();
	});

	it("creates a medicine with all required fields", async () => {
		const medicineData = {
			name: `Paracetamol ${context.uniqueId}`,
			genericName: "Acetaminophen",
			category: "ANALGESICS",
			type: "TABLET",
			unit: "tablets",
		};

		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(medicineData);

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("id");
		expect(response.body.name).toBe(medicineData.name);
		expect(response.body.genericName).toBe(medicineData.genericName);
		expect(response.body.category).toBe(medicineData.category);
		expect(response.body.type).toBe(medicineData.type);
		expect(response.body.unit).toBe(medicineData.unit);
		expect(response.body).toHaveProperty("code");

		// Verify in database
		const medicine = await Medicine.findById(response.body.id).lean();
		expect(medicine).not.toBeNull();
		expect(medicine?.tenantId).toBe(context.hospitalId);
		expect(medicine?.name).toBe(medicineData.name);
	});

	it("creates a medicine with all optional fields", async () => {
		const medicineData = {
			name: `Ibuprofen ${context.uniqueId}`,
			genericName: "Ibuprofen",
			code: `IBU-${context.uniqueId}`,
			category: "ANALGESICS",
			type: "CAPSULE",
			manufacturer: "PharmaCorp",
			strength: "400mg",
			unit: "capsules",
			reorderLevel: 50,
			maxStock: 1000,
			description: "Anti-inflammatory pain reliever",
		};

		const response = await request(app)
			.post("/api/inventory/medicines")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(medicineData);

		expect(response.status).toBe(201);
		expect(response.body.code).toBe(medicineData.code);
		expect(response.body.manufacturer).toBe(medicineData.manufacturer);
		expect(response.body.strength).toBe(medicineData.strength);
		expect(response.body.description).toBe(medicineData.description);
	});
});
