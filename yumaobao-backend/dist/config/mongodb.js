"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToMongoDB = connectToMongoDB;
exports.getDB = getDB;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// MongoDB连接URL - 明确使用IPv4地址
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017';
// 数据库名称
const DB_NAME = process.env.MONGODB_DB_NAME || 'yumaobao';
// 创建MongoDB客户端
const client = new mongodb_1.MongoClient(MONGODB_URL);
// 数据库实例
let db;
// 连接到MongoDB
async function connectToMongoDB() {
    try {
        // 连接到MongoDB - 旧版本驱动不支持connect选项参数
        await client.connect();
        // 连接成功后测试数据库访问
        db = client.db(DB_NAME);
        console.log('MongoDB连接成功，数据库:', DB_NAME);
        return db;
    }
    catch (error) {
        console.error('MongoDB连接失败:', error);
        // 数据库连接是系统核心功能，连接失败时应抛出错误
        throw new Error('无法连接到MongoDB数据库，请检查配置和数据库服务状态');
    }
}
// 获取数据库实例
function getDB() {
    return db;
}
