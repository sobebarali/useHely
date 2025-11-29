import path from "node:path";
import { connectDB } from "@hms/db";
import dotenv from "dotenv";
import { afterAll, beforeAll } from "vitest";

// Load environment variables before anything else
// Use __dirname to get absolute path since tests run from apps/server directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

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
