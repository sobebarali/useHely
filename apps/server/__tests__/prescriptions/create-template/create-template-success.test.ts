import { PrescriptionTemplate } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/prescriptions/templates - Create template success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let createdTemplateId: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PRESCRIPTION:CREATE", "PRESCRIPTION:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		if (createdTemplateId) {
			await PrescriptionTemplate.deleteOne({ _id: createdTemplateId });
		}
		await context.cleanup();
	});

	it("creates a prescription template successfully", async () => {
		const payload = {
			name: `Cold & Flu Template ${context.uniqueId}`,
			category: "General Medicine",
			condition: "Common cold and flu symptoms",
			medicines: [
				{
					name: "Paracetamol",
					dosage: "500mg",
					frequency: "3 times daily",
					duration: "5 days",
					route: "Oral",
					instructions: "Take after meals with water",
				},
				{
					name: "Cetirizine",
					dosage: "10mg",
					frequency: "Once daily",
					duration: "7 days",
					route: "Oral",
					instructions: "Take at night before sleep",
				},
				{
					name: "Vitamin C",
					dosage: "1000mg",
					frequency: "Once daily",
					duration: "10 days",
					route: "Oral",
					instructions: "Take in the morning",
				},
			],
		};

		const response = await request(app)
			.post("/api/prescriptions/templates")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty("id");
		expect(response.body.name).toBe(payload.name);
		expect(response.body.category).toBe(payload.category);
		expect(response.body.condition).toBe(payload.condition);

		// Verify medicines
		expect(response.body.medicines).toHaveLength(3);
		expect(response.body.medicines[0]).toEqual(
			expect.objectContaining({
				name: "Paracetamol",
				dosage: "500mg",
				frequency: "3 times daily",
				duration: "5 days",
				route: "Oral",
				instructions: "Take after meals with water",
			}),
		);
		expect(response.body.medicines[0]).toHaveProperty("id");

		// Verify creator info
		expect(response.body.createdBy).toHaveProperty("id", context.staffId);
		expect(response.body).toHaveProperty("createdAt");

		createdTemplateId = response.body.id;
	});

	it("returns 409 for duplicate template name", async () => {
		const payload = {
			name: `Duplicate Template ${context.uniqueId}`,
			category: "General Medicine",
			condition: "Test condition",
			medicines: [
				{
					name: "Test Medicine",
					dosage: "100mg",
					frequency: "Daily",
					duration: "3 days",
					route: "Oral",
				},
			],
		};

		// Create first template
		const firstResponse = await request(app)
			.post("/api/prescriptions/templates")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(firstResponse.status).toBe(201);
		const firstTemplateId = firstResponse.body.id;

		// Try to create duplicate
		const secondResponse = await request(app)
			.post("/api/prescriptions/templates")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(secondResponse.status).toBe(409);
		expect(secondResponse.body.code).toBe("DUPLICATE_NAME");

		// Cleanup
		await PrescriptionTemplate.deleteOne({ _id: firstTemplateId });
	});

	it("returns 400 for missing required fields", async () => {
		const payload = {
			name: "Incomplete Template",
			// Missing category and medicines
		};

		const response = await request(app)
			.post("/api/prescriptions/templates")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
	});

	it("returns 401 without authentication", async () => {
		const payload = {
			name: "Unauthorized Template",
			category: "Test",
			medicines: [],
		};

		const response = await request(app)
			.post("/api/prescriptions/templates")
			.send(payload);

		expect(response.status).toBe(401);
	});
});
