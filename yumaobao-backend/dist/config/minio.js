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
        for (const bucket of Object.values(exports.MINIO_BUCKETS)) {
            const exists = await exports.minioClient.bucketExists(bucket);
            if (!exists) {
                await exports.minioClient.makeBucket(bucket, 'us-east-1');
                console.log(`Bucket '${bucket}' created successfully`);
            }
        }
    }
    catch (error) {
        console.error('Error ensuring buckets exist:', error);
    }
};
exports.ensureBucketsExist = ensureBucketsExist;
