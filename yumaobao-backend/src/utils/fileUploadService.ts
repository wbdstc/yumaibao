import { minioClient } from '../config/minio';
import fs from 'fs';
import path from 'path';





// IFC转换结果类型
export interface IFCConversionResult {
  success: boolean;
  outputFile?: string;
  outputUrl?: string;
  objectName?: string;
  message?: string;
  conversionTime?: number;
  originalSize?: number;
  convertedSize?: number;
  errorDetails?: {
    code: string;
    details: string;
    suggestions: string[];
  };
}

// IFC转换参数类型
export interface IFCConversionParams {
  inputFile: string;
  outputFormat: 'gltf' | 'glb' | 'obj';
  isLightweight?: boolean;
  quality?: number; // 0-100
  includeMaterials?: boolean;
  includeTextures?: boolean;
  timeout?: number; // 转换超时时间（毫秒）
  onProgress?: (progress: number, message: string) => void; // 进度回调函数
}

// IFC转换状态类型
export interface IFCConversionStatus {
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout';
  progress: number; // 0-100
  message: string;
  startTime?: number;
  endTime?: number;
  conversionTime?: number;
}

// 生成详细的错误详情
export const generateErrorDetails = (error: any): { code: string; details: string; suggestions: string[] } => {
  const errorCode = error.code || 'UNKNOWN_ERROR';
  const errorMessage = error.message || '未知错误';
  const suggestions: string[] = [];

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

// IFC转换结果类型
export interface IFCConversionResult {
  success: boolean;
  outputFile?: string;
  outputUrl?: string;
  objectName?: string;
  message?: string;
  conversionTime?: number;
  originalSize?: number;
  convertedSize?: number;
  errorDetails?: {
    code: string;
    details: string;
    suggestions: string[];
  };
}

// 转换进度管理类
class ConversionProgressManager {
  private progressCallbacks: Map<string, (progress: number, message: string) => void> = new Map();

  updateProgress(conversionId: string, progress: number, message: string) {
    const callback = this.progressCallbacks.get(conversionId);
    if (callback) {
      callback(progress, message);
    }
  }

  setCallback(conversionId: string, callback: (progress: number, message: string) => void) {
    this.progressCallbacks.set(conversionId, callback);
  }

  removeCallback(conversionId: string) {
    this.progressCallbacks.delete(conversionId);
  }
}

// 全局转换进度管理器实例
export const conversionProgressManager = new ConversionProgressManager();

// 执行带超时的转换操作
export const executeWithTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = '操作超时',
  onProgress?: (progress: number, message: string) => void
): Promise<T> => {
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

// 验证转换参数的有效性
export const validateConversionParams = (params: IFCConversionParams): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

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

// 工具函数：清理文件名，确保中文字符和特殊字符正确处理
const sanitizeFileName = (fileName: string): string => {
  try {
    // 使用Unicode字符类来匹配中文字符和英文字符，替换特殊字符
    return fileName
      .replace(/[^\w\u4e00-\u9fff\-_.]/g, '_') // 保留中文字符、英文字符、数字、下划线、连字符和点
      .replace(/_+/g, '_') // 合并多个下划线
      .replace(/^_|_$/g, ''); // 移除开头和结尾的下划线
  } catch (error) {
    console.error('文件名清理失败:', error);
    // 如果清理失败，使用时间戳作为备选方案
    return `file_${Date.now()}`;
  }
};

// 工具函数：生成安全的临时文件路径
export const generateSafeTempFilePath = (originalFileName: string, prefix: string = 'temp'): string => {
  try {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 生成安全的文件名
    const fileNameWithoutExt = path.basename(originalFileName, path.extname(originalFileName));
    const extName = path.extname(originalFileName).toLowerCase();
    const safeFileName = sanitizeFileName(fileNameWithoutExt);
    const timestamp = Date.now();
    const tempFileName = `${prefix}_${safeFileName}_${timestamp}${extName}`;
    
    return path.join(tempDir, tempFileName);
  } catch (error) {
    console.error('生成临时文件路径失败:', error);
    // 备选方案：使用简单的临时文件路径
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    return path.join(tempDir, `${prefix}_${Date.now()}.tmp`);
  }
};

// 工具函数：生成安全的输出文件路径
export const generateSafeOutputFilePath = (inputFilePath: string, outputFormat: string): string => {
  try {
    const inputDir = path.dirname(inputFilePath);
    const inputFileNameWithoutExt = path.basename(inputFilePath, path.extname(inputFilePath));
    const safeFileName = sanitizeFileName(inputFileNameWithoutExt);
    
    // 生成输出文件名，格式为：原文件名_转换格式_时间戳.扩展名
    const timestamp = Date.now();
    const outputFileName = `${safeFileName}_converted_${timestamp}.${outputFormat.toLowerCase()}`;
    
    return path.join(inputDir, outputFileName);
  } catch (error) {
    console.error('生成输出文件路径失败:', error);
    // 备选方案：使用简单路径
    const inputDir = path.dirname(inputFilePath);
    return path.join(inputDir, `converted_${Date.now()}.${outputFormat.toLowerCase()}`);
  }
};

// 工具函数：清理临时文件
export const cleanupTempFiles = (filePaths: string[]): void => {
  try {
    filePaths.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`已清理临时文件: ${filePath}`);
      }
    });
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
};

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

    // 生成唯一的对象名称 - 确保中文字符正确处理
const originalFileName = file.originalname;
const extName = path.extname(originalFileName).toLowerCase().substring(1);
const fileNameWithoutExt = path.basename(originalFileName, path.extname(originalFileName));

// 生成安全的文件名，避免中文和特殊字符问题
const safeFileName = sanitizeFileName(fileNameWithoutExt);
const uniqueObjectName = objectName || `${safeFileName}.${extName}`;
const objectPath = `${extName}/${uniqueObjectName}`;

    // 上传文件到MinIO
    await minioClient.putObject(
      bucketName,
      objectPath,
      file.buffer || fs.createReadStream(file.path),
      file.size,
      { 'Content-Type': file.mimetype }
    );

    // 生成访问URL - 确保包含完整的协议前缀
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const url = `${protocol}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${objectPath}`;

    return { url, objectName: objectPath };
  } catch (error) {
    console.error('上传文件到MinIO失败:', error);
    throw error;
  }
};

// 从MinIO下载文件
export const downloadFileFromMinIO = async (bucketName: string, objectName: string): Promise<Buffer> => {
  try {
    // 处理MinIO文件
    const stream = await minioClient.getObject(bucketName, objectName);
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('下载文件失败:', error);
    throw error;
  }
};

// 从MinIO删除文件
export const deleteFileFromMinIO = async (bucketName: string, objectName: string): Promise<void> => {
  try {
    // 处理MinIO文件
    try {
      await minioClient.removeObject(bucketName, objectName);
    } catch (minioError) {
      console.error('MinIO删除文件失败:', minioError);
      // 不抛出错误，避免影响主流程
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
