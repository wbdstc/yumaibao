import { minioClient } from '../config/minio';
import fs from 'fs';
import path from 'path';

// 文件上传到MinIO
export const uploadFileToMinIO = async (
  bucketName: string,
  file: Express.Multer.File,
  objectName?: string
): Promise<{ url: string; objectName: string }> => {
  try {
    // 检查存储桶是否存在
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      // 创建存储桶
      await minioClient.makeBucket(bucketName, 'us-east-1');
    }

    // 生成唯一的对象名称
    const uniqueObjectName = objectName || `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    const objectPath = `${path.extname(file.originalname).toLowerCase().substring(1)}/${uniqueObjectName}`;

    // 上传文件到MinIO
    await minioClient.putObject(
      bucketName,
      objectPath,
      file.buffer || fs.createReadStream(file.path),
      file.size,
      { 'Content-Type': file.mimetype }
    );

    // 生成访问URL
    const url = `${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${objectPath}`;

    return { url, objectName: objectPath };
  } catch (error) {
    console.error('上传文件到MinIO失败:', error);
    throw error;
  }
};

// 从MinIO下载文件
export const downloadFileFromMinIO = async (bucketName: string, objectName: string): Promise<Buffer> => {
  try {
    const stream = await minioClient.getObject(bucketName, objectName);
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('从MinIO下载文件失败:', error);
    throw error;
  }
};

// 从MinIO删除文件
export const deleteFileFromMinIO = async (bucketName: string, objectName: string): Promise<void> => {
  try {
    await minioClient.removeObject(bucketName, objectName);
  } catch (error) {
    console.error('从MinIO删除文件失败:', error);
    throw error;
  }
};

// 获取文件的预签名URL
export const getPresignedUrl = async (
  bucketName: string,
  objectName: string,
  expiresInSeconds = 60 * 60 // 默认1小时
): Promise<string> => {
  try {
    return await minioClient.presignedGetObject(bucketName, objectName, expiresInSeconds);
  } catch (error) {
    console.error('获取预签名URL失败:', error);
    throw error;
  }
};
