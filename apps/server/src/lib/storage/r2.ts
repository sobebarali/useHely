/**
 * Cloudflare R2 Storage Client
 *
 * S3-compatible storage client using AWS SDK v3
 * Follows the same pattern as redis.ts for graceful fallback
 */

import {
	DeleteObjectCommand,
	type DeleteObjectCommandInput,
	GetObjectCommand,
	type GetObjectCommandInput,
	HeadObjectCommand,
	PutObjectCommand,
	type PutObjectCommandInput,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 Configuration from environment
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "usehely-media";

const isR2Configured = Boolean(
	R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY,
);

// Create S3 client for R2
const createR2Client = (): S3Client | null => {
	if (!isR2Configured) {
		return null;
	}

	return new S3Client({
		region: "auto",
		endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: R2_ACCESS_KEY_ID!,
			secretAccessKey: R2_SECRET_ACCESS_KEY!,
		},
	});
};

const r2Client = createR2Client();

/**
 * Upload a file to R2 storage
 */
export async function uploadFile({
	key,
	body,
	contentType,
	metadata,
	bucket = R2_BUCKET_NAME,
}: {
	key: string;
	body: Buffer | Uint8Array | string;
	contentType: string;
	metadata?: Record<string, string>;
	bucket?: string;
}): Promise<{ key: string; bucket: string } | null> {
	if (!r2Client) {
		console.warn("[R2] Storage not configured, skipping upload");
		return null;
	}

	const params: PutObjectCommandInput = {
		Bucket: bucket,
		Key: key,
		Body: body,
		ContentType: contentType,
		Metadata: metadata,
	};

	await r2Client.send(new PutObjectCommand(params));

	return { key, bucket };
}

/**
 * Get a file from R2 storage
 */
export async function getFile({
	key,
	bucket = R2_BUCKET_NAME,
}: {
	key: string;
	bucket?: string;
}): Promise<{ body: Uint8Array; contentType: string | undefined } | null> {
	if (!r2Client) {
		console.warn("[R2] Storage not configured, cannot retrieve file");
		return null;
	}

	const params: GetObjectCommandInput = {
		Bucket: bucket,
		Key: key,
	};

	const response = await r2Client.send(new GetObjectCommand(params));

	if (!response.Body) {
		return null;
	}

	const body = await response.Body.transformToByteArray();

	return {
		body,
		contentType: response.ContentType,
	};
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFile({
	key,
	bucket = R2_BUCKET_NAME,
}: {
	key: string;
	bucket?: string;
}): Promise<boolean> {
	if (!r2Client) {
		console.warn("[R2] Storage not configured, cannot delete file");
		return false;
	}

	const params: DeleteObjectCommandInput = {
		Bucket: bucket,
		Key: key,
	};

	await r2Client.send(new DeleteObjectCommand(params));

	return true;
}

/**
 * Check if a file exists in R2 storage
 */
export async function fileExists({
	key,
	bucket = R2_BUCKET_NAME,
}: {
	key: string;
	bucket?: string;
}): Promise<boolean> {
	if (!r2Client) {
		return false;
	}

	try {
		await r2Client.send(
			new HeadObjectCommand({
				Bucket: bucket,
				Key: key,
			}),
		);
		return true;
	} catch {
		return false;
	}
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function getSignedDownloadUrl({
	key,
	bucket = R2_BUCKET_NAME,
	expiresIn = 3600,
}: {
	key: string;
	bucket?: string;
	expiresIn?: number;
}): Promise<string | null> {
	if (!r2Client) {
		console.warn("[R2] Storage not configured, cannot generate download URL");
		return null;
	}

	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
	});

	return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for uploading a file
 */
export async function getSignedUploadUrl({
	key,
	contentType,
	bucket = R2_BUCKET_NAME,
	expiresIn = 3600,
}: {
	key: string;
	contentType: string;
	bucket?: string;
	expiresIn?: number;
}): Promise<string | null> {
	if (!r2Client) {
		console.warn("[R2] Storage not configured, cannot generate upload URL");
		return null;
	}

	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		ContentType: contentType,
	});

	return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Get public URL for a file (if bucket has public access enabled)
 * Note: R2 public URLs require custom domain or R2.dev subdomain
 */
export function getPublicUrl({
	key,
	customDomain,
}: {
	key: string;
	customDomain?: string;
}): string | null {
	if (!isR2Configured) {
		return null;
	}

	if (customDomain) {
		return `https://${customDomain}/${key}`;
	}

	// Default R2.dev public URL format (requires public access enabled)
	return `https://pub-${R2_ACCOUNT_ID}.r2.dev/${key}`;
}

export { isR2Configured, R2_BUCKET_NAME };
