import "dotenv/config";
import { connectDB } from "@hms/db";
import cors from "cors";
import express from "express";
import authRoutes from "./apis/auth/auth.routes";
import hospitalRoutes from "./apis/hospital/hospital.routes";
import patientsRoutes from "./apis/patients/patients.routes";
import rolesRoutes from "./apis/roles/roles.routes";
import usersRoutes from "./apis/users/users.routes";
import { logger } from "./lib/logger";
import { errorHandler } from "./middlewares/error-handler";
import { requestContext } from "./middlewares/request-context";
import { requestLogger } from "./middlewares/request-logger";

// Connect to database
logger.info("Connecting to database...");
await connectDB();
logger.info("Database connected successfully");

export const app = express();

// Request context middleware (MUST BE FIRST)
app.use(requestContext);

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "",
		methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.use(express.json());

// Request logger middleware (AFTER body parsing so req.body is available)
app.use(requestLogger);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/patients", patientsRoutes);

app.get("/", (_req, res) => {
	res.status(200).send("OK");
});

// Global error handler (MUST BE LAST)
app.use(errorHandler);

// Only start server if not in test environment
if (process.env.NODE_ENV !== "test") {
	const port = process.env.PORT || 3000;
	app.listen(port, () => {
		logger.info({ port }, `Server is running on port ${port}`);
	});
}
