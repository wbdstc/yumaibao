import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

// 路由导入
import userRoutes from './routes/userRoutes';

// 数据库导入（暂时注释掉）
// import sequelize from './config/database';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 配置中间件
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查路由
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: '预埋宝后端API服务运行正常' });
});

// API路由注册
app.use('/api/users', userRoutes);

// 启动服务器（暂时跳过数据库同步）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器已启动，监听端口 ${PORT}`);
  console.log('服务器已启动，数据库同步功能暂时已禁用');
});

// 数据库同步代码（暂时注释掉）
/*
sequelize.sync({ force: false }) // force: false 表示不删除已有表
  .then(() => {
    console.log('数据库连接成功并同步完成');
  })
  .catch((error) => {
    console.error('数据库连接或同步失败:', error);
    process.exit(1);
  });
*/

export default app;
