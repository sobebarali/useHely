/**
 * Audit Log Worker
 *
 * Processes audit log emission jobs for reliable, distributed audit logging
 */

import crypto from "node:crypto";
import { AuditLog } from "@hms/db";
import { type Job, Worker } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { createUtilLogger, logError } from "../../logger";
import { createRedisConnection, redis } from "../../redis";
import { AUDIT_JOB_TYPES, type EmitAuditLogJobData } from "../jobs/audit.job";
import { QUEUE_NAMES } from "../queues";

const logger = createUtilLogger("auditWorker");

// Genesis hash for the hash chain
const HASH_CHAIN_GENESIS =
	"0000000000000000000000000000000000000000000000000000000000000000";

// Redis key prefix for last hash cache
const LAST_HASH_KEY_PREFIX = "audit:hash:";

/**
 * Compute SHA-256 hash for integrity chain
 * Hash_N = SHA-256(Entry_N + Hash_N-1)
 */
function computeHash(data: string, previousHash: string): string {
	return crypto
		.createHash("sha256")
		.update(data + previousHash)
		.digest("hex");
}

/**
 * Get the previous hash for a tenant from Redis cache or database
 */
async function getPreviousHash(tenantId: string): Promise<string> {
	// Check Redis cache first
	const cacheKey = `${LAST_HASH_KEY_PREFIX}${tenantId}`;
	const cachedHash = await redis.get(cacheKey);
	if (cachedHash) {
		return cachedHash;
	}

	// Query database for the most recent entry
	const lastEntry = await AuditLog.findOne({ tenantId })
		.sort({ timestamp: -1 })
		.select("hash")
		.lean();

	const hash = lastEntry?.hash || HASH_CHAIN_GENESIS;

	// Cache the hash in Redis
	await redis.setex(cacheKey, 3600, hash); // Cache for 1 hour

	return hash;
}

/**
 * Update the last hash cache in Redis
 */
async function updateLastHashCache(
	tenantId: string,
	hash: string,
): Promise<void> {
	const cacheKey = `${LAST_HASH_KEY_PREFIX}${tenantId}`;
	await redis.setex(cacheKey, 3600, hash);
}

/**
 * Process audit log emission
 */
async function processAuditLogEmission(
	data: EmitAuditLogJobData,
): Promise<void> {
	const {
		tenantId,
		eventType,
		category,
		userId,
		userName,
		action,
		resourceType,
		resourceId,
		ip,
		userAgent,
		sessionId,
		details,
		before,
		after,
		eventTimestamp,
	} = data;

	const eventId = uuidv4();
	const timestamp = new Date(eventTimestamp);

	logger.debug(
		{
			eventId,
			eventType,
			category,
			tenantId,
			userId,
		},
		"Processing audit log emission",
	);

	// Get previous hash for chain integrity
	const previousHash = await getPreviousHash(tenantId);

	// Create entry data for hashing
	const entryData = JSON.stringify({
		eventId,
		tenantId,
		eventType,
		category,
		userId,
		userName,
		action,
		resourceType,
		resourceId,
		ip,
		userAgent,
		sessionId,
		details,
		before,
		after,
		timestamp: timestamp.toISOString(),
	});

	// Compute hash chain
	const hash = computeHash(entryData, previousHash);

	// Create audit log entry
	await AuditLog.create({
		_id: eventId,
		tenantId,
		eventType,
		category,
		userId,
		userName,
		action: action || null,
		resourceType: resourceType || null,
		resourceId: resourceId || null,
		ip: ip || null,
		userAgent: userAgent || null,
		sessionId: sessionId || null,
		details: details || null,
		before: before || null,
		after: after || null,
		hash,
		previousHash,
		timestamp,
	});

	// Update cache with new hash
	await updateLastHashCache(tenantId, hash);

	logger.debug({ eventId, eventType }, "Audit log emitted successfully");
}

/**
 * Process audit log jobs
 */
async function processAuditJob(job: Job): Promise<void> {
	logger.debug({ jobId: job.id, type: job.name }, "Processing audit job");

	switch (job.name) {
		case AUDIT_JOB_TYPES.EMIT_AUDIT_LOG:
			await processAuditLogEmission(job.data as EmitAuditLogJobData);
			break;
		default:
			throw new Error(`Unknown audit job type: ${job.name}`);
	}
}

/**
 * Create and start the audit log worker
 *
 * IMPORTANT: Concurrency is set to 1 to ensure hash chain integrity.
 * The hash chain requires sequential processing to maintain the
 * previousHash -> currentHash linkage. Parallel processing would
 * break the chain.
 */
export function createAuditWorker(): Worker {
	const connection = createRedisConnection();

	const worker = new Worker(QUEUE_NAMES.AUDIT_LOG, processAuditJob, {
		connection,
		concurrency: 1, // MUST be 1 to maintain hash chain integrity
	});

	worker.on("completed", (job) => {
		logger.debug({ jobId: job.id }, "Audit job completed");
	});

	worker.on("failed", (job, error) => {
		logError(logger, error, "Audit job failed", { jobId: job?.id });
	});

	worker.on("error", (error) => {
		logError(logger, error, "Audit worker error");
	});

	logger.info("Audit worker started");
	return worker;
}
