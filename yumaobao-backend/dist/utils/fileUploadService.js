"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPresignedUrl = exports.deleteFileFromMinIO = exports.downloadFileFromMinIO = exports.uploadFileToMinIO = exports.cleanupTempFiles = exports.generateSafeOutputFilePath = exports.generateSafeTempFilePath = exports.getFileStreamFromMinIO = exports.validateConversionParams = exports.executeWithTimeout = exports.conversionProgressManager = exports.generateErrorDetails = void 0;
const minio_1 = require("../config/minio");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 生成详细的错误详情
const generateErrorDetails = (error) => {
    const errorCode = error.code || 'UNKNOWN_ERROR';
    const errorMessage = error.message || '未知错误';
    const suggestions = [];
    // 根据错误类型生成建议
    switch (errorCode) {
        case 'TIMEOUT_ERROR':
            suggestions.push('文件可能过大，尝试使用更简单的模型或调整转换参数');
            suggestions.push('检查系统资源是否充足（内存、磁盘空间）');
            suggestions.push('稍后重试转换操作');
            break;
        case 'FILE_NOT_FOUND':
            suggestions.push('检查文件路径是否正确');
            suggestions.push('确认文件未被移动或删除');
            break;
        case 'IFC_OPENSHELL_NOT_AVAILABLE':
            suggestions.push('请确认IfcOpenShell已正确安装');
            suggestions.push('检查IFC_OPEN_SHELL_PATH环境变量设置');
            break;
        case 'CONVERSION_FAILED':
            suggestions.push('检查IFC文件格式是否完整');
            suggestions.push('尝试使用更小的文件进行测试');
            suggestions.push('查看转换日志以获取详细错误信息');
            break;
        case 'PERMISSION_ERROR':
            suggestions.push('检查文件读写权限');
            suggestions.push('确保应用程序有足够的磁盘空间');
            break;
        default:
            suggestions.push('查看服务器日志获取更多详细信息');
            suggestions.push('尝试重新上传文件');
    }
    return {
        code: errorCode,
        details: errorMessage,
        suggestions
    };
};
exports.generateErrorDetails = generateErrorDetails;
// 转换进度管理类
class ConversionProgressManager {
    constructor() {
        this.progressCallbacks = new Map();
    }
    updateProgress(conversionId, progress, message) {
        const callback = this.progressCallbacks.get(conversionId);
        if (callback) {
            callback(progress, message);
        }
    }
    setCallback(conversionId, callback) {
        this.progressCallbacks.set(conversionId, callback);
    }
    removeCallback(conversionId) {
        this.progressCallbacks.delete(conversionId);
    }
}
// 全局转换进度管理器实例
exports.conversionProgressManager = new ConversionProgressManager();
// 执行带超时的转换操作
const executeWithTimeout = async (operation, timeoutMs, timeoutMessage = '操作超时', onProgress) => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            onProgress?.(0, '转换超时');
            reject(new Error('TIMEOUT_ERROR: ' + timeoutMessage));
        }, timeoutMs);
        operation()
            .then(result => {
            clearTimeout(timeoutId);
            onProgress?.(100, '转换完成');
            resolve(result);
        })
            .catch(error => {
            clearTimeout(timeoutId);
            onProgress?.(0, '转换失败');
            reject(error);
        });
    });
};
exports.executeWithTimeout = executeWithTimeout;
// 验证转换参数的有效性
const validateConversionParams = (params) => {
    const errors = [];
    if (!params.inputFile) {
        errors.push('输入文件路径不能为空');
    }
    if (!params.outputFormat || !['gltf', 'glb', 'obj'].includes(params.outputFormat)) {
        errors.push('输出格式必须是 gltf、glb 或 obj');
    }
    if (params.quality !== undefined && (params.quality < 0 || params.quality > 100)) {
        errors.push('质量参数必须在 0-100 范围内');
    }
    if (params.timeout !== undefined && params.timeout < 1000) {
        errors.push('超时时间不能少于 1 秒');
    }
    return {
        valid: errors.length === 0,
        errors
    };
};
exports.validateConversionParams = validateConversionParams;
// 工具函数：清理文件名，确保中文字符和特殊字符正确处理
const sanitizeFileName = (fileName) => {
    try {
        // 使用Unicode字符类来匹配中文字符和英文字符，替换特殊字符
        return fileName
            .replace(/[^\w\u4e00-\u9fff\-_.]/g, '_') // 保留中文字符、英文字符、数字、下划线、连字符和点
            .replace(/_+/g, '_') // 合并多个下划线
            .replace(/^_|_$/g, ''); // 移除开头和结尾的下划线
    }
    catch (error) {
        console.error('文件名清理失败:', error);
        // 如果清理失败，使用时间戳作为备选方案
        return `file_${Date.now()}`;
    }
};
// 新增：获取文件流（推荐用于下载）
const getFileStreamFromMinIO = async (bucketName, objectName) => {
    try {
        // 直接返回 MinIO 的原始流
        return await minio_1.minioClient.getObject(bucketName, objectName);
    }
    catch (error) {
        console.error('获取文件流失败:', error);
        throw error;
    }
};
exports.getFileStreamFromMinIO = getFileStreamFromMinIO;
// 工具函数：生成安全的临时文件路径
const generateSafeTempFilePath = (originalFileName, prefix = 'temp') => {
    try {
        const tempDir = path_1.default.join(__dirname, '../../temp');
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        // 生成安全的文件名
        const fileNameWithoutExt = path_1.default.basename(originalFileName, path_1.default.extname(originalFileName));
        const extName = path_1.default.extname(originalFileName).toLowerCase();
        const safeFileName = sanitizeFileName(fileNameWithoutExt);
        const timestamp = Date.now();
        const tempFileName = `${prefix}_${safeFileName}_${timestamp}${extName}`;
        return path_1.default.join(tempDir, tempFileName);
    }
    catch (error) {
        console.error('生成临时文件路径失败:', error);
        // 备选方案：使用简单的临时文件路径
        const tempDir = path_1.default.join(__dirname, '../../temp');
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        return path_1.default.join(tempDir, `${prefix}_${Date.now()}.tmp`);
    }
};
exports.generateSafeTempFilePath = generateSafeTempFilePath;
// 工具函数：生成安全的输出文件路径
const generateSafeOutputFilePath = (inputFilePath, outputFormat) => {
    try {
        const inputDir = path_1.default.dirname(inputFilePath);
        const inputFileNameWithoutExt = path_1.default.basename(inputFilePath, path_1.default.extname(inputFilePath));
        const safeFileName = sanitizeFileName(inputFileNameWithoutExt);
        // 生成输出文件名，格式为：原文件名_转换格式_时间戳.扩展名
        const timestamp = Date.now();
        const outputFileName = `${safeFileName}_converted_${timestamp}.${outputFormat.toLowerCase()}`;
        return path_1.default.join(inputDir, outputFileName);
    }
    catch (error) {
        console.error('生成输出文件路径失败:', error);
        // 备选方案：使用简单路径
        const inputDir = path_1.default.dirname(inputFilePath);
        return path_1.default.join(inputDir, `converted_${Date.now()}.${outputFormat.toLowerCase()}`);
    }
};
exports.generateSafeOutputFilePath = generateSafeOutputFilePath;
// 工具函数：清理临时文件
const cleanupTempFiles = (filePaths) => {
    try {
        filePaths.forEach(filePath => {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
                console.log(`已清理临时文件: ${filePath}`);
            }
        });
    }
    catch (error) {
        console.error('清理临时文件失败:', error);
    }
};
exports.cleanupTempFiles = cleanupTempFiles;
// 文件上传到MinIO
const uploadFileToMinIO = async (bucketName, file, objectName) => {
    try {
        // 检查存储桶是否存在
        const bucketExists = await minio_1.minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            // 创建存储桶
            await minio_1.minioClient.makeBucket(bucketName, 'us-east-1');
        }
        // 生成唯一的对象名称 - 确保中文字符正确处理
        const originalFileName = file.originalname;
        const extName = path_1.default.extname(originalFileName).toLowerCase().substring(1);
        const fileNameWithoutExt = path_1.default.basename(originalFileName, path_1.default.extname(originalFileName));
        // 生成安全的文件名，避免中文和特殊字符问题
        const safeFileName = sanitizeFileName(fileNameWithoutExt);
        const uniqueObjectName = objectName || `${safeFileName}.${extName}`;
        const objectPath = `${extName}/${uniqueObjectName}`;
        // 上传文件到MinIO
        await minio_1.minioClient.putObject(bucketName, objectPath, file.buffer || fs_1.default.createReadStream(file.path), file.size, { 'Content-Type': file.mimetype });
        // 生成访问URL - 确保包含完整的协议前缀
        const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
        const url = `${protocol}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${objectPath}`;
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
        // 确保以二进制模式读取流
        for await (const chunk of stream) {
            // 确保chunk是Buffer类型，避免编码转换
            if (Buffer.isBuffer(chunk)) {
                chunks.push(chunk);
            }
            else {
                // 如果不是Buffer，转换为Buffer（保持二进制数据）
                chunks.push(Buffer.from(chunk));
            }
        }
        // 拼接所有chunks，保持二进制数据完整性
        const resultBuffer = Buffer.concat(chunks);
        // 记录下载的文件大小，用于调试
        console.log(`从MinIO下载文件: bucket=${bucketName}, object=${objectName}, size=${resultBuffer.length}字节`);
        return resultBuffer;
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
