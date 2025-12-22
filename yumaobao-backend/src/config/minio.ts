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
    // 首先测试MinIO连接
    await minioClient.listBuckets();
    
    for (const bucket of Object.values(MINIO_BUCKETS)) {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
        console.log(`Bucket '${bucket}' created successfully`);
      }
    }
    return { success: true, message: '所有存储桶已创建或存在' };
  } catch (error) {
    console.error('Error ensuring buckets exist:', error);
    const errorCode = (error as any).code;
    if (errorCode === 'ECONNREFUSED') {
      console.error('MinIO服务未运行，请检查MinIO服务状态');
      return { success: false, message: 'MinIO服务未运行，请检查MinIO服务状态', error: errorCode };
    }
    return { success: false, message: 'MinIO初始化失败', error: errorCode };
  }
};
