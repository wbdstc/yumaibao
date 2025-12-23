import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// 路由导入
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import modelRoutes from './routes/modelRoutes';
import embeddedPartRoutes from './routes/embeddedPartRoutes';
import mobileRoutes from './routes/mobileRoutes';
import reportRoutes from './routes/reportRoutes';

// 数据库导入
import { connectToMongoDB } from './config/mongodb';
// MinIO配置
import { ensureBucketsExist } from './config/minio';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 配置中间件
app.use(cors({
  origin: '*', // 允许所有来源
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许所有方法
  allowedHeaders: ['Origin', 'Content-Type', 'Authorization'], // 允许所有头
  credentials: true // 允许凭证
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查路由
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: '预埋宝后端API服务运行正常' });
});

// API路由注册
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/embedded-parts', embeddedPartRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/reports', reportRoutes);

// 设置MIME类型映射
app.use((req, res, next) => {
  // 确保JavaScript文件（包括worker文件）返回正确的MIME类型
  if (req.url.endsWith('.js') || req.url.endsWith('.worker.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// 前端静态文件服务 - 确保所有静态文件都能被正确访问
app.use(express.static(path.join(__dirname, '../../yumaobao-frontend/dist')));
// 特别处理assets目录，确保worker文件能被正确访问
app.use('/assets', express.static(path.join(__dirname, '../../yumaobao-frontend/dist/assets')));

// 数据库连接和同步
async function startServer() {
  try {
    // 连接MongoDB
    await connectToMongoDB();
    console.log('MongoDB数据库连接成功');
    
    // 初始化MinIO存储桶
    const minioInitResult = await ensureBucketsExist();
    if (!minioInitResult.success) {
      console.error('MinIO存储桶初始化失败:', minioInitResult.message);
      console.error('系统将继续运行，但部分功能可能不可用');
      // 不要终止服务器，让系统在MinIO不可用时仍能运行基本功能
    } else {
      console.log('MinIO存储桶初始化成功');
    }
    
    // 启动服务器
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`服务器已启动，监听端口 ${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

export default app;
