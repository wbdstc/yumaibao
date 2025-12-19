"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresignedUrl = exports.deleteFileFromMinIO = exports.downloadFileFromMinIO = exports.uploadFileToMinIO = void 0;
const minio_1 = require("../config/minio");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 确保上传目录存在
const ensureUploadDirExists = (dir) => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
};
// 文件上传到MinIO或本地文件系统
const uploadFileToMinIO = async (bucketName, file, objectName) => {
    try {
        // 尝试使用MinIO上传
        try {
            // 检查存储桶是否存在
            const bucketExists = await minio_1.minioClient.bucketExists(bucketName);
            if (!bucketExists) {
                // 创建存储桶
                await minio_1.minioClient.makeBucket(bucketName, 'us-east-1');
            }
            // 生成唯一的对象名称
            const uniqueObjectName = objectName || `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
            const objectPath = `${path_1.default.extname(file.originalname).toLowerCase().substring(1)}/${uniqueObjectName}`;
            // 上传文件到MinIO
            await minio_1.minioClient.putObject(bucketName, objectPath, file.buffer || fs_1.default.createReadStream(file.path), file.size, { 'Content-Type': file.mimetype });
            // 生成访问URL
            const url = `${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${objectPath}`;
            return { url, objectName: objectPath };
        }
        catch (minioError) {
            console.error('MinIO上传失败，使用本地文件系统:', minioError);
            // 使用本地文件系统作为后备
            const uploadDir = path_1.default.join(__dirname, '../../uploads', bucketName);
            ensureUploadDirExists(uploadDir);
            const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
            const filePath = path_1.default.join(uploadDir, uniqueFileName);
            // 保存文件到本地
            if (file.buffer) {
                fs_1.default.writeFileSync(filePath, file.buffer);
            }
            else if (file.path) {
                fs_1.default.copyFileSync(file.path, filePath);
            }
            else {
                throw new Error('文件数据不可用');
            }
            // 生成本地访问URL
            const url = `/uploads/${bucketName}/${uniqueFileName}`;
            return { url, objectName: `local://${bucketName}/${uniqueFileName}` };
        }
    }
    catch (error) {
        console.error('上传文件失败:', error);
        throw error;
    }
};
exports.uploadFileToMinIO = uploadFileToMinIO;
// 从MinIO或本地文件系统下载文件
const downloadFileFromMinIO = async (bucketName, objectName) => {
    try {
        // 检查是否为本地文件
        if (objectName.startsWith('local://')) {
            // 处理本地文件
            const localPath = objectName.substring(8); // 移除 'local://' 前缀
            const filePath = path_1.default.join(__dirname, '../../uploads', localPath);
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error('本地文件不存在');
            }
            return fs_1.default.readFileSync(filePath);
        }
        else {
            // 处理MinIO文件
            const stream = await minio_1.minioClient.getObject(bucketName, objectName);
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        }
    }
    catch (error) {
        console.error('下载文件失败:', error);
        throw error;
    }
};
exports.downloadFileFromMinIO = downloadFileFromMinIO;
// 从MinIO或本地文件系统删除文件
const deleteFileFromMinIO = async (bucketName, objectName) => {
    try {
        // 检查是否为本地文件
        if (objectName.startsWith('local://')) {
            // 处理本地文件
            const localPath = objectName.substring(8); // 移除 'local://' 前缀
            const filePath = path_1.default.join(__dirname, '../../uploads', localPath);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        else {
            // 处理MinIO文件
            await minio_1.minioClient.removeObject(bucketName, objectName);
        }
    }
    catch (error) {
        console.error('删除文件失败:', error);
        throw error;
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
