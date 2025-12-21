import { minioClient } from '../config/minio';
import fs from 'fs';
import path from 'path';

// 确保上传目录存在
const ensureUploadDirExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 文件上传到MinIO或本地文件系统
export const uploadFileToMinIO = async (
  bucketName: string,
  file: Express.Multer.File,
  objectName?: string
): Promise<{ url: string; objectName: string }> => {
  try {
    // 尝试使用MinIO上传
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
    } catch (minioError) {
      console.error('MinIO上传失败，使用本地文件系统:', minioError);
      
      // 使用本地文件系统作为后备
      const uploadDir = path.join(__dirname, '../../uploads', bucketName);
      ensureUploadDirExists(uploadDir);
      
      const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
      const filePath = path.join(uploadDir, uniqueFileName);
      
      // 保存文件到本地
      if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
      } else if (file.path) {
        fs.copyFileSync(file.path, filePath);
      } else {
        throw new Error('文件数据不可用');
      }
      
      // 生成本地访问URL
      const url = `/uploads/${bucketName}/${uniqueFileName}`;
      return { url, objectName: `local://${bucketName}/${uniqueFileName}` };
    }
  } catch (error) {
    console.error('上传文件失败:', error);
    throw error;
  }
};

// 从MinIO或本地文件系统下载文件
export const downloadFileFromMinIO = async (bucketName: string, objectName: string): Promise<Buffer> => {
  try {
    // 检查是否为本地文件
    if (objectName.startsWith('local://')) {
      // 处理本地文件
      const localPath = objectName.substring(8); // 移除 'local://' 前缀
      const filePath = path.join(__dirname, '../../uploads', localPath);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('本地文件不存在');
      }
      
      return fs.readFileSync(filePath);
    } else {
      // 处理MinIO文件
      const stream = await minioClient.getObject(bucketName, objectName);
      const chunks: Buffer[] = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    }
  } catch (error) {
    console.error('下载文件失败:', error);
    throw error;
  }
};

// 从MinIO或本地文件系统删除文件
export const deleteFileFromMinIO = async (bucketName: string, objectName: string): Promise<void> => {
  try {
    // 检查是否为本地文件
    if (objectName.startsWith('local://')) {
      // 处理本地文件
      const localPath = objectName.substring(8); // 移除 'local://' 前缀
      const filePath = path.join(__dirname, '../../uploads', localPath);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else {
      // 处理MinIO文件
      try {
        await minioClient.removeObject(bucketName, objectName);
      } catch (minioError) {
        console.error('MinIO删除文件失败，可能服务未运行或连接失败:', minioError);
        // 不抛出错误，继续执行后续逻辑
      }
    }
  } catch (error) {
    console.error('删除文件失败:', error);
    // 不抛出错误，避免影响主流程
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
