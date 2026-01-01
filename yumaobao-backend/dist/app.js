"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// 路由导入
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const modelRoutes_1 = __importDefault(require("./routes/modelRoutes"));
const embeddedPartRoutes_1 = __importDefault(require("./routes/embeddedPartRoutes"));
const mobileRoutes_1 = __importDefault(require("./routes/mobileRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
// 数据库导入
const mongodb_1 = require("./config/mongodb");
// MinIO配置
const minio_1 = require("./config/minio");
// 加载环境变量
dotenv_1.default.config();
// 创建Express应用
const app = (0, express_1.default)();
// 配置中间件
app.use((0, cors_1.default)({
    origin: '*', // 允许所有来源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许所有方法
    allowedHeaders: ['Origin', 'Content-Type', 'Authorization'], // 允许所有头
    credentials: true // 允许凭证
}));
// 配置 body parser - 重要：确保二进制数据不会被错误解析
app.use(body_parser_1.default.json({ limit: '50mb', verify: (req, _res, _buf, _encoding) => {
        // 对于二进制请求，不要解析 JSON
        if (req.is && (req.is('multipart/form-data') || req.is('application/octet-stream'))) {
            return;
        }
    } }));
app.use(body_parser_1.default.urlencoded({ extended: true, limit: '50mb' }));
// 健康检查路由
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', message: '预埋宝后端API服务运行正常' });
});
// API路由注册
app.use('/api/users', userRoutes_1.default);
app.use('/api/projects', projectRoutes_1.default);
app.use('/api/models', modelRoutes_1.default);
app.use('/api/embedded-parts', embeddedPartRoutes_1.default);
app.use('/api/mobile', mobileRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
// 设置MIME类型映射
app.use((req, res, next) => {
    // 确保JavaScript文件（包括worker文件）返回正确的MIME类型
    if (req.url.endsWith('.js') || req.url.endsWith('.worker.js')) {
        res.setHeader('Content-Type', 'application/javascript');
    }
    next();
});
// 静态文件服务
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// 前端静态文件服务 - 确保所有静态文件都能被正确访问
app.use(express_1.default.static(path_1.default.join(__dirname, '../../yumaobao-frontend/dist')));
// 特别处理assets目录，确保worker文件能被正确访问
app.use('/assets', express_1.default.static(path_1.default.join(__dirname, '../../yumaobao-frontend/dist/assets')));
// 数据库连接和同步
async function startServer() {
    try {
        // 连接MongoDB
        await (0, mongodb_1.connectToMongoDB)();
        console.log('MongoDB数据库连接成功');
        // 初始化MinIO存储桶
        const minioInitResult = await (0, minio_1.ensureBucketsExist)();
        if (!minioInitResult.success) {
            console.error('MinIO存储桶初始化失败:', minioInitResult.message);
            console.error('系统将继续运行，但部分功能可能不可用');
            // 不要终止服务器，让系统在MinIO不可用时仍能运行基本功能
        }
        else {
            console.log('MinIO存储桶初始化成功');
        }
        // 启动服务器
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`服务器已启动，监听端口 ${PORT}`);
        });
    }
    catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
}
// 启动服务器
startServer();
exports.default = app;
