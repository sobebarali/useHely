/**
 * BullMQ Queue Definitions
 *
 * Centralized queue configuration for background job processing
 */

import { Queue } from "bullmq";
import { createUtilLogger } from "../logger";
import { createRedisConnection } from "../redis";

const logger = createUtilLogger("queues");

// Queue names
export const QUEUE_NAMES = {
	EMAIL: "email",
	EXPORT: "export",
	REPORT: "report",
	AUDIT_LOG: "audit-log",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Default job options per queue
export const DEFAULT_JOB_OPTIONS = {
	[QUEUE_NAMES.EMAIL]: {
		attempts: 3,
		backoff: {
			type: "exponential" as const,
			delay: 2000, // Start with 2 seconds
		},
		removeOnComplete: {
			age: 24 * 60 * 60, // Keep completed jobs for 24 hours
			count: 1000, // Keep last 1000 completed jobs
		},
		removeOnFail: {
			age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
		},
	},
	[QUEUE_NAMES.EXPORT]: {
		attempts: 2,
		backoff: {
			type: "exponential" as const,
			delay: 5000,
		},
		removeOnComplete: {
			age: 7 * 24 * 60 * 60, // Keep for 7 days
			count: 500,
		},
		removeOnFail: {
			age: 30 * 24 * 60 * 60, // Keep failed for 30 days
		},
	},
	[QUEUE_NAMES.REPORT]: {
		attempts: 2,
		backoff: {
			type: "exponential" as const,
			delay: 5000,
		},
		removeOnComplete: {
			age: 7 * 24 * 60 * 60,
			count: 500,
		},
		removeOnFail: {
			age: 30 * 24 * 60 * 60,
		},
	},
	[QUEUE_NAMES.AUDIT_LOG]: {
		attempts: 5, // More retries for compliance-critical logs
		backoff: {
			type: "exponential" as const,
			delay: 1000,
		},
		removeOnComplete: {
			age: 60 * 60, // Keep for 1 hour (audit logs are persisted to DB)
			count: 10000,
		},
		removeOnFail: {
			age: 7 * 24 * 60 * 60, // Keep failed for investigation
		},
	},
};

// Create shared Redis connection for queues
const queueConnection = createRedisConnection();

// Initialize queues
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
	connection: queueConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.EMAIL],
});

export const exportQueue = new Queue(QUEUE_NAMES.EXPORT, {
	connection: queueConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.EXPORT],
});

export const reportQueue = new Queue(QUEUE_NAMES.REPORT, {
	connection: queueConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.REPORT],
});

export const auditLogQueue = new Queue(QUEUE_NAMES.AUDIT_LOG, {
	connection: queueConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS[QUEUE_NAMES.AUDIT_LOG],
});

// Log queue events
const queues = [emailQueue, exportQueue, reportQueue, auditLogQueue];

for (const queue of queues) {
	queue.on("error", (error) => {
		logger.error({ queue: queue.name, error }, "Queue error");
	});
}

/**
 * Close all queue connections gracefully
 */
export async function closeQueues(): Promise<void> {
	logger.info("Closing queue connections...");
	await Promise.all(queues.map((queue) => queue.close()));
	await queueConnection.quit();
	logger.info("All queue connections closed");
}

/**
 * Get all queues for monitoring/admin purposes
 */
export function getAllQueues(): Queue[] {
	return queues;
}
