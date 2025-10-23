import * as Minio from 'minio';

// Allow disabling S3 usage via configuration (S3_ENABLED=false)
export const s3Enabled = process.env.S3_ENABLED !== 'false';

const s3Host = process.env.S3_HOST;
const s3Port = process.env.S3_PORT ? parseInt(process.env.S3_PORT, 10) : undefined;
const s3UseSSL = process.env.S3_USE_SSL ? process.env.S3_USE_SSL === 'true' : true;

export const s3client: Minio.Client | null = (s3Enabled && s3Host)
    ? new Minio.Client({
        endPoint: s3Host,
        port: s3Port,
        useSSL: s3UseSSL,
        accessKey: process.env.S3_ACCESS_KEY!,
        secretKey: process.env.S3_SECRET_KEY!,
    })
    : null;

export const s3bucket = process.env.S3_BUCKET || '';

export const s3host = s3Host || '';

export const s3public = process.env.S3_PUBLIC_URL || '';

export async function loadFiles() {
    if (!s3Enabled || !s3client) return;
    await s3client.bucketExists(s3bucket); // Throws if bucket does not exist or is not accessible
}

export function getPublicUrl(path: string) {
    if (!s3Enabled || !s3public) return path;
    return `${s3public}/${path}`;
}

export type ImageRef = {
    width: number;
    height: number;
    thumbhash: string;
    path: string;
}
