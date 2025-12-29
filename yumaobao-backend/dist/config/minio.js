"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureBucketsExist = exports.MINIO_BUCKETS = exports.minioClient = void 0;
const minio_1 = require("minio");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// 创建MinIO客户端实例
exports.minioClient = new minio_1.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});
// MinIO存储桶名称
exports.MINIO_BUCKETS = {
    MODELS: 'models',
    REPORTS: 'reports',
    QRCODES: 'qrcodes',
    UPLOADS: 'uploads',
};
// 确保存储桶存在
const ensureBucketsExist = async () => {
    try {
        // 首先测试MinIO连接
        await exports.minioClient.listBuckets();
        for (const bucket of Object.values(exports.MINIO_BUCKETS)) {
            const exists = await exports.minioClient.bucketExists(bucket);
            if (!exists) {
                await exports.minioClient.makeBucket(bucket, 'us-east-1');
                console.log(`Bucket '${bucket}' created successfully`);
            }
            // 设置存储桶策略，允许公开访问
            const policy = JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: '*',
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${bucket}/*`]
                    }
                ]
            });
            await exports.minioClient.setBucketPolicy(bucket, policy);
            console.log(`Bucket policy set for '${bucket}'`);
        }
        return { success: true, message: '所有存储桶已创建或存在' };
    }
    catch (error) {
        console.error('Error ensuring buckets exist:', error);
        const errorCode = error.code;
        if (errorCode === 'ECONNREFUSED') {
            console.error('MinIO服务未运行，请检查MinIO服务状态');
            return { success: false, message: 'MinIO服务未运行，请检查MinIO服务状态', error: errorCode };
        }
        return { success: false, message: 'MinIO初始化失败', error: errorCode };
    }
};
exports.ensureBucketsExist = ensureBucketsExist;
