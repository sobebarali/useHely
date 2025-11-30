import { PrescriptionTemplate } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/prescriptions/templates - List templates success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const templateIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PRESCRIPTION:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test templates with different categories
		const templates = [
			{
				name: `Cardio Template ${context.uniqueId}`,
				category: "Cardiology",
				condition: "Hypertension management",
				medicines: [
					{
						// Let Mongoose auto-generate _id
						name: "Amlodipine",
						dosage: "5mg",
						frequency: "Once daily",
						duration: "30 days",
						route: "Oral",
					},
				],
			},
			{
				name: `Neuro Template ${context.uniqueId}`,
				category: "Neurology",
				condition: "Migraine prevention",
				medicines: [
					{
						// Let Mongoose auto-generate _id
						name: "Topiramate",
						dosage: "25mg",
						frequency: "Twice daily",
						duration: "90 days",
						route: "Oral",
					},
				],
			},
			{
				name: `Another Cardio ${context.uniqueId}`,
				category: "Cardiology",
				condition: "Heart failure management",
				medicines: [
					{
						// Let Mongoose auto-generate _id
						name: "Metoprolol",
						dosage: "50mg",
						frequency: "Once daily",
						duration: "30 days",
						route: "Oral",
					},
				],
			},
		];

		for (const template of templates) {
			const id = uuidv4();
			templateIds.push(id);
			await PrescriptionTemplate.create({
				_id: id,
				tenantId: context.hospitalId,
				...template,
				createdBy: context.staffId,
				isSystem: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}
	}, 30000);

	afterAll(async () => {
		for (const id of templateIds) {
			await PrescriptionTemplate.deleteOne({ _id: id });
		}
		await context.cleanup();
	});

	it("lists all templates for the tenant", async () => {
		const response = await request(app)
			.get("/api/prescriptions/templates")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body).toHaveProperty("count");
		expect(response.body.data.length).toBeGreaterThanOrEqual(3);

		// Verify template structure
		const template = response.body.data[0];
		expect(template).toHaveProperty("id");
		expect(template).toHaveProperty("name");
		expect(template).toHaveProperty("category");
		expect(template).toHaveProperty("condition");
		expect(template).toHaveProperty("medicines");
		expect(template).toHaveProperty("isSystem");

		// Verify medicine structure
		expect(template.medicines[0]).toHaveProperty("id");
		expect(template.medicines[0]).toHaveProperty("name");
		expect(template.medicines[0]).toHaveProperty("dosage");
		expect(template.medicines[0]).toHaveProperty("frequency");
		expect(template.medicines[0]).toHaveProperty("duration");
		expect(template.medicines[0]).toHaveProperty("route");
	});

	it("filters templates by category", async () => {
		const response = await request(app)
			.get("/api/prescriptions/templates?category=Cardiology")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThanOrEqual(2);
		for (const template of response.body.data) {
			expect(template.category).toBe("Cardiology");
		}
	});

	it("searches templates by name", async () => {
		const response = await request(app)
			.get("/api/prescriptions/templates?search=Neuro")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.length).toBeGreaterThanOrEqual(1);
		const found = response.body.data.some((t: { name: string }) =>
			t.name.includes("Neuro"),
		);
		expect(found).toBe(true);
	});

	it("includes creator information when available", async () => {
		const response = await request(app)
			.get("/api/prescriptions/templates")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Find a template created by our test user
		const userTemplate = response.body.data.find(
			(t: { createdBy?: { id: string } }) =>
				t.createdBy && t.createdBy.id === context.staffId,
		);

		if (userTemplate) {
			expect(userTemplate.createdBy).toHaveProperty("id", context.staffId);
			expect(userTemplate.createdBy).toHaveProperty("firstName");
			expect(userTemplate.createdBy).toHaveProperty("lastName");
		}
	});

	it("returns 401 without authentication", async () => {
		const response = await request(app).get("/api/prescriptions/templates");

		expect(response.status).toBe(401);
	});
});
