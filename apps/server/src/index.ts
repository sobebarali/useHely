import "dotenv/config";
import { connectDB } from "@hms/db";
import cors from "cors";
import express from "express";
import appointmentsRoutes from "./apis/appointments/appointments.routes";
import auditRoutes from "./apis/audit/audit.routes";
import authRoutes from "./apis/auth/auth.routes";
import dashboardRoutes from "./apis/dashboard/dashboard.routes";
import departmentsRoutes from "./apis/departments/departments.routes";
import dispensingRoutes from "./apis/dispensing/dispensing.routes";
import hospitalRoutes from "./apis/hospital/hospital.routes";
import inventoryRoutes from "./apis/inventory/inventory.routes";
import menuRoutes from "./apis/menu/menu.routes";
import patientsRoutes from "./apis/patients/patients.routes";
import prescriptionsRoutes from "./apis/prescriptions/prescriptions.routes";
import reportsRoutes from "./apis/reports/reports.routes";
import rolesRoutes from "./apis/roles/roles.routes";
import securityRoutes from "./apis/security/security.routes";
import usersRoutes from "./apis/users/users.routes";
import vitalsRoutes from "./apis/vitals/vitals.routes";
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

// CORS configuration with fail-closed approach
// In production, CORS_ORIGIN must be explicitly configured
// In development/test, defaults to localhost for convenience
const corsOrigin =
	process.env.CORS_ORIGIN ||
	(process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
		? "http://localhost:3000"
		: false); // Deny all origins if not configured in production

if (corsOrigin === false && process.env.NODE_ENV === "production") {
	logger.warn(
		"CORS_ORIGIN not configured in production - all cross-origin requests will be denied",
	);
}

app.use(
	cors({
		origin: corsOrigin,
		methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.use(express.json());

// Request logger middleware (AFTER body parsing so req.body is available)
app.use(requestLogger);

// API Routes
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/dispensing", dispensingRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/prescriptions", prescriptionsRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/vitals", vitalsRoutes);
app.use("/api/reports", reportsRoutes);

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
