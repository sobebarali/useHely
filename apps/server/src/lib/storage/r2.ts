/**
 * Cloudflare R2 Storage Client
 *
 * S3-compatible storage client using AWS SDK v3
 * Uses lazy initialization to ensure environment variables are loaded
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

// R2 Configuration - lazy loaded from environment
const getR2Config = () => ({
	accountId: process.env.R2_ACCOUNT_ID,
	accessKeyId: process.env.R2_ACCESS_KEY_ID,
	secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
	bucketName: process.env.R2_BUCKET_NAME || "usehely-media",
});

// Getter for bucket name (lazy evaluated)
const getBucketName = () => process.env.R2_BUCKET_NAME || "usehely-media";

// Check if R2 is configured (lazy evaluated)
const checkR2Configured = (): boolean => {
	const config = getR2Config();
	return Boolean(
		config.accountId && config.accessKeyId && config.secretAccessKey,
	);
};

// Lazy-initialized S3 client
let r2ClientInstance: S3Client | null = null;

const getR2Client = (): S3Client | null => {
	// Check config each time to handle late env loading in tests
	if (!checkR2Configured()) {
		return null;
	}

	if (r2ClientInstance) {
		return r2ClientInstance;
	}

	const config = getR2Config();

	r2ClientInstance = new S3Client({
		region: "auto",
		endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: config.accessKeyId!,
			secretAccessKey: config.secretAccessKey!,
		},
	});

	return r2ClientInstance;
};

/**
 * Upload a file to R2 storage
 */
export async function uploadFile({
	key,
	body,
	contentType,
	metadata,
	bucket,
}: {
	key: string;
	body: Buffer | Uint8Array | string;
	contentType: string;
	metadata?: Record<string, string>;
	bucket?: string;
}): Promise<{ key: string; bucket: string } | null> {
	const r2Client = getR2Client();
	const bucketName = bucket || getBucketName();

	if (!r2Client) {
		console.warn("[R2] Storage not configured, skipping upload");
		return null;
	}

	const params: PutObjectCommandInput = {
		Bucket: bucketName,
		Key: key,
		Body: body,
		ContentType: contentType,
		Metadata: metadata,
	};

	await r2Client.send(new PutObjectCommand(params));

	return { key, bucket: bucketName };
}

/**
 * Get a file from R2 storage
 */
export async function getFile({
	key,
	bucket,
}: {
	key: string;
	bucket?: string;
}): Promise<{ body: Uint8Array; contentType: string | undefined } | null> {
	const r2Client = getR2Client();
	const bucketName = bucket || getBucketName();

	if (!r2Client) {
		console.warn("[R2] Storage not configured, cannot retrieve file");
		return null;
	}

	const params: GetObjectCommandInput = {
		Bucket: bucketName,
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
	bucket,
}: {
	key: string;
	bucket?: string;
}): Promise<boolean> {
	const r2Client = getR2Client();
	const bucketName = bucket || getBucketName();

	if (!r2Client) {
		console.warn("[R2] Storage not configured, cannot delete file");
		return false;
	}

	const params: DeleteObjectCommandInput = {
		Bucket: bucketName,
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
	bucket,
}: {
	key: string;
	bucket?: string;
}): Promise<boolean> {
	const r2Client = getR2Client();
	const bucketName = bucket || getBucketName();

	if (!r2Client) {
		return false;
	}

	try {
		await r2Client.send(
			new HeadObjectCommand({
				Bucket: bucketName,
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
	bucket,
	expiresIn = 3600,
}: {
	key: string;
	bucket?: string;
	expiresIn?: number;
}): Promise<string | null> {
	const r2Client = getR2Client();
	const bucketName = bucket || getBucketName();

	if (!r2Client) {
		console.warn("[R2] Storage not configured, cannot generate download URL");
		return null;
	}

	const command = new GetObjectCommand({
		Bucket: bucketName,
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
	bucket,
	expiresIn = 3600,
}: {
	key: string;
	contentType: string;
	bucket?: string;
	expiresIn?: number;
}): Promise<string | null> {
	const r2Client = getR2Client();
	const bucketName = bucket || getBucketName();

	if (!r2Client) {
		console.warn("[R2] Storage not configured, cannot generate upload URL");
		return null;
	}

	const command = new PutObjectCommand({
		Bucket: bucketName,
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
	const config = getR2Config();

	if (!checkR2Configured()) {
		return null;
	}

	if (customDomain) {
		return `https://${customDomain}/${key}`;
	}

	// Default R2.dev public URL format (requires public access enabled)
	return `https://pub-${config.accountId}.r2.dev/${key}`;
}

// Export lazy-evaluated getters
export const isR2Configured = checkR2Configured();
export const R2_BUCKET_NAME = getBucketName();

// Re-export the check function for runtime evaluation
export { checkR2Configured };
