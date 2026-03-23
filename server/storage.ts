// DigitalOcean Spaces Object Storage (S3-compatible)
// Bucket: due-intelligence-storage | Region: nyc3
// CDN: https://due-intelligence-storage.nyc3.cdn.digitaloceanspaces.com

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from './_core/env';
import { withCircuitBreaker, withRetryAndBackoff } from './_core/resilience';
import { logger } from './_core/logger';

function getS3Client(): S3Client {
  const { doSpacesKey, doSpacesSecret, doSpacesRegion, doSpacesEndpoint } = ENV;

  if (!doSpacesKey || !doSpacesSecret) {
    throw new Error(
      "DigitalOcean Spaces credentials missing: set DO_SPACES_KEY and DO_SPACES_SECRET"
    );
  }

  return new S3Client({
    region: doSpacesRegion,
    endpoint: doSpacesEndpoint,
    credentials: {
      accessKeyId: doSpacesKey,
      secretAccessKey: doSpacesSecret,
    },
    forcePathStyle: false,
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Executa o upload para o DigitalOcean Spaces
 */
async function executeStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const key = normalizeKey(relKey);
  const bucket = ENV.doSpacesBucket;

  const body = typeof data === 'string' ? Buffer.from(data) : data;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read',
  }));

  const cdnUrl = `${ENV.doSpacesCdnEndpoint}/${key}`;

  return { key, url: cdnUrl };
}

/**
 * Gera presigned URL de download do DigitalOcean Spaces
 */
async function executeStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const key = normalizeKey(relKey);
  const bucket = ENV.doSpacesBucket;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn: 3600 });

  return { key, url };
}

/**
 * Upload de arquivo para o DigitalOcean Spaces com resiliência
 * Aplica Circuit Breaker e Retry com Backoff Exponencial
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  logger.debug('Storage upload iniciado', { 
    key: relKey, 
    contentType,
    dataSize: typeof data === 'string' ? data.length : data.byteLength
  });

  try {
    const result = await withCircuitBreaker('storage-s3', () =>
      withRetryAndBackoff(
        () => executeStoragePut(relKey, data, contentType),
        { maxRetries: 3, initialDelay: 500, maxDelay: 10000 }
      )
    );

    logger.info('Storage upload concluído', { key: result.key });
    return result;
  } catch (error) {
    logger.error('Erro no upload para storage', error as Error, { key: relKey });
    throw error;
  }
}

/**
 * Obtém URL presigned de download do DigitalOcean Spaces com resiliência
 * Aplica Circuit Breaker e Retry com Backoff Exponencial
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  logger.debug('Storage get iniciado', { key: relKey });

  try {
    const result = await withCircuitBreaker('storage-s3', () =>
      withRetryAndBackoff(
        () => executeStorageGet(relKey),
        { maxRetries: 3, initialDelay: 500, maxDelay: 10000 }
      )
    );

    logger.debug('Storage get concluído', { key: result.key });
    return result;
  } catch (error) {
    logger.error('Erro ao obter URL do storage', error as Error, { key: relKey });
    throw error;
  }
}
