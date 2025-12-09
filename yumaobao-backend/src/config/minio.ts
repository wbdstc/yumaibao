import { Client } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

// 创建MinIO客户端实例
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// MinIO存储桶名称
export const MINIO_BUCKETS = {
  MODELS: 'models',
  REPORTS: 'reports',
  QRCODES: 'qrcodes',
  UPLOADS: 'uploads',
};

// 确保存储桶存在
export const ensureBucketsExist = async () => {
  try {
    for (const bucket of Object.values(MINIO_BUCKETS)) {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
        console.log(`Bucket '${bucket}' created successfully`);
      }
    }
  } catch (error) {
    console.error('Error ensuring buckets exist:', error);
  }
};
