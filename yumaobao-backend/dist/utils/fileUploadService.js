"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresignedUrl = exports.deleteFileFromMinIO = exports.downloadFileFromMinIO = exports.uploadFileToMinIO = void 0;
const minio_1 = require("../config/minio");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 文件上传到MinIO
const uploadFileToMinIO = async (bucketName, file, objectName) => {
    try {
        // 检查存储桶是否存在
        const bucketExists = await minio_1.minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            // 创建存储桶
            await minio_1.minioClient.makeBucket(bucketName, 'us-east-1');
        }
        // 生成唯一的对象名称 - 保留原始文件名，不添加随机前缀，确保中文文件名正确处理
        const fileNameWithoutExt = path_1.default.basename(file.originalname, path_1.default.extname(file.originalname));
        const extName = path_1.default.extname(file.originalname).toLowerCase().substring(1);
        const uniqueObjectName = objectName || `${fileNameWithoutExt}.${extName}`;
        const objectPath = `${extName}/${uniqueObjectName}`;
        // 上传文件到MinIO
        await minio_1.minioClient.putObject(bucketName, objectPath, file.buffer || fs_1.default.createReadStream(file.path), file.size, { 'Content-Type': file.mimetype });
        // 生成访问URL
        const url = `${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${objectPath}`;
        return { url, objectName: objectPath };
    }
    catch (error) {
        console.error('上传文件到MinIO失败:', error);
        throw error;
    }
};
exports.uploadFileToMinIO = uploadFileToMinIO;
// 从MinIO下载文件
const downloadFileFromMinIO = async (bucketName, objectName) => {
    try {
        // 处理MinIO文件
        const stream = await minio_1.minioClient.getObject(bucketName, objectName);
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    catch (error) {
        console.error('下载文件失败:', error);
        throw error;
    }
};
exports.downloadFileFromMinIO = downloadFileFromMinIO;
// 从MinIO删除文件
const deleteFileFromMinIO = async (bucketName, objectName) => {
    try {
        // 处理MinIO文件
        try {
            await minio_1.minioClient.removeObject(bucketName, objectName);
        }
        catch (minioError) {
            console.error('MinIO删除文件失败:', minioError);
            // 不抛出错误，避免影响主流程
        }
    }
    catch (error) {
        console.error('删除文件失败:', error);
        // 不抛出错误，避免影响主流程
    }
};
exports.deleteFileFromMinIO = deleteFileFromMinIO;
// 获取文件的预签名URL
const getPresignedUrl = async (bucketName, objectName, expiresInSeconds = 60 * 60 // 默认1小时
) => {
    try {
        return await minio_1.minioClient.presignedGetObject(bucketName, objectName, expiresInSeconds);
    }
    catch (error) {
        console.error('获取预签名URL失败:', error);
        throw error;
    }
};
exports.getPresignedUrl = getPresignedUrl;
