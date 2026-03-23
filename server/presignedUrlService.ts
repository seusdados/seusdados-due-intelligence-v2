// server/presignedUrlService.ts
//
// Serviço para gerar URLs presigned para documentos em bucket privado.
// Usa DigitalOcean Spaces (S3-compatible).

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from './_core/env';
import { logger } from "./_core/logger";

export type PresignedUrlResult = {
  url: string;
  expiresIn: number; // segundos
  generatedAt: Date;
};

/**
 * Gera URL presigned para documento no DigitalOcean Spaces.
 */
export async function generatePresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<PresignedUrlResult | null> {
  try {
    const { doSpacesKey, doSpacesSecret, doSpacesRegion, doSpacesEndpoint, doSpacesBucket } = ENV;

    if (!doSpacesKey || !doSpacesSecret) {
      logger.warn("[PresignedUrlService] DO Spaces credentials not configured");
      return null;
    }

    const s3Client = new S3Client({
      region: doSpacesRegion,
      endpoint: doSpacesEndpoint,
      credentials: {
        accessKeyId: doSpacesKey,
        secretAccessKey: doSpacesSecret,
      },
      forcePathStyle: false,
    });

    const command = new GetObjectCommand({
      Bucket: doSpacesBucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      url,
      expiresIn,
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.warn("[PresignedUrlService] Erro ao gerar presigned URL", {
      key,
      message: String(error),
    });
    return null;
  }
}

// Aliases para compatibilidade
export const generatePresignedUrlForS3 = (
  _bucket: string,
  key: string,
  expiresIn?: number
) => generatePresignedUrl(key, expiresIn);

export const generatePresignedUrlViaManus = (
  storageKey: string,
  expiresIn?: number
) => generatePresignedUrl(storageKey, expiresIn);
