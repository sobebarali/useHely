import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("POST /api/patients - Validation errors", () => {
	let context: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		context = await createAuthTestContext({
			rolePermissions: ["PATIENT:CREATE", "PATIENT:READ"],
			includeDepartment: true,
		});
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		await context.cleanup();
	});

	it("returns 400 when firstName is missing", async () => {
		const payload = {
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-val-${context.uniqueId}`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when lastName is missing", async () => {
		const payload = {
			firstName: "John",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-val2-${context.uniqueId}`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when dateOfBirth has invalid format", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "not-a-date",
			gender: "MALE",
			phone: `+1-val3-${context.uniqueId}`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when gender is invalid", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "INVALID",
			phone: `+1-val4-${context.uniqueId}`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when phone is missing", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when email has invalid format", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-val5-${context.uniqueId}`,
			email: "not-an-email",
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when address is missing", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-val6-${context.uniqueId}`,
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when emergencyContact is missing", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-val7-${context.uniqueId}`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when patientType is invalid", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			phone: `+1-val8-${context.uniqueId}`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "INVALID",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});

	it("returns 400 when bloodGroup is invalid", async () => {
		const payload = {
			firstName: "John",
			lastName: "Doe",
			dateOfBirth: "1990-05-15T00:00:00.000Z",
			gender: "MALE",
			bloodGroup: "X+",
			phone: `+1-val9-${context.uniqueId}`,
			address: {
				street: "123 Main St",
				city: "Test City",
				state: "TS",
				postalCode: "12345",
				country: "USA",
			},
			emergencyContact: {
				name: "Jane Doe",
				relationship: "Spouse",
				phone: "+1-555-1234",
			},
			patientType: "OPD",
		};

		const response = await request(app)
			.post("/api/patients")
			.set("Authorization", `Bearer ${accessToken}`)
			.send(payload);

		expect(response.status).toBe(400);
		expect(response.body.code).toBe("INVALID_REQUEST");
	});
});
