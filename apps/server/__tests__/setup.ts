import fs from "node:fs";
import path from "node:path";
import { connectDB } from "@hms/db";
import dotenv from "dotenv";
import { afterAll, beforeAll } from "vitest";

// Load environment variables before anything else
// Prefer .env.test for test environment, fallback to .env
const envTestPath = path.resolve(__dirname, "../.env.test");
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envTestPath)) {
	dotenv.config({ path: envTestPath });
} else {
	dotenv.config({ path: envPath });
}

beforeAll(async () => {
	// Connect to database before running tests
	await connectDB();
});

afterAll(async () => {
	// Global teardown - runs once after all tests
});

// Test utilities can be added here
export const testUtils = {
	// Add any shared test utilities here
	// Example: createTestUser, cleanupDatabase, etc.
};
