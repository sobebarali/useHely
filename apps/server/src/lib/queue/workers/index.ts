/**
 * Worker Initialization
 *
 * Initializes and manages all background job workers
 */

import type { Worker } from "bullmq";
import { createUtilLogger } from "../../logger";
import { isRedisConfigured } from "../../redis";
import { createAuditWorker } from "./audit.worker";
import { createEmailWorker } from "./email.worker";
import { createExportWorker } from "./export.worker";
import { createReportWorker } from "./report.worker";

const logger = createUtilLogger("workers");

// Track active workers
const activeWorkers: Worker[] = [];

/**
 * Start all background workers
 *
 * NOTE: Workers require a real Redis connection. If Redis is not configured,
 * workers will not start and jobs will be queued but not processed until
 * Redis becomes available.
 */
export function startWorkers(): void {
	if (!isRedisConfigured) {
		logger.warn(
			"Redis not configured - background workers will NOT start. " +
				"Jobs will be queued in-memory but NOT processed. " +
				"Configure REDIS_HOST and REDIS_PASSWORD for production use.",
		);
		return;
	}

	logger.info("Starting background workers...");

	try {
		// Create and track all workers
		const emailWorker = createEmailWorker();
		const exportWorker = createExportWorker();
		const reportWorker = createReportWorker();
		const auditWorker = createAuditWorker();

		activeWorkers.push(emailWorker, exportWorker, reportWorker, auditWorker);

		logger.info(
			{ workerCount: activeWorkers.length },
			"All background workers started successfully",
		);
	} catch (error) {
		logger.error({ error }, "Failed to start background workers");
		throw error;
	}
}

/**
 * Stop all background workers gracefully
 */
export async function stopWorkers(): Promise<void> {
	logger.info("Stopping background workers...");

	const closePromises = activeWorkers.map(async (worker) => {
		try {
			await worker.close();
			logger.debug({ workerName: worker.name }, "Worker stopped");
		} catch (error) {
			logger.error({ workerName: worker.name, error }, "Error stopping worker");
		}
	});

	await Promise.all(closePromises);
	activeWorkers.length = 0;

	logger.info("All background workers stopped");
}

/**
 * Get the list of active workers
 */
export function getActiveWorkers(): Worker[] {
	return [...activeWorkers];
}

export { createAuditWorker } from "./audit.worker";
// Re-export individual worker creators for testing
export { createEmailWorker } from "./email.worker";
export { createExportWorker } from "./export.worker";
export { createReportWorker } from "./report.worker";
