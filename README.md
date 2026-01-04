# 预埋宝系统 - 项目运行说明文档

## 一、系统概述

**系统名称**：基于BIM的建筑预埋件智能管理系统（预埋宝）

**技术架构**：
- 前端：Vue 3 + Vite + Element Plus + Three.js
- 后端：Express + TypeScript + Node.js
- 数据库：MongoDB 7.0
- 对象存储：MinIO
- 反向代理：Nginx

---

## 二、环境要求

### 2.1 软件环境

| 软件 | 版本要求 | 说明 |
|:-----|:---------|:-----|
| Node.js | 18.x LTS 或更高 | JavaScript 运行时 |
| npm | 9.x 或更高 | 包管理器（随 Node.js 安装） |
| MongoDB | 7.0 或更高 | 文档数据库 |
| MinIO | 最新版 | 对象存储服务 |
| Git | 2.x | 版本控制（可选） |

### 2.2 硬件环境

| 配置项 | 最低要求 | 推荐配置 |
|:-------|:---------|:---------|
| CPU | 双核 2.0GHz | 四核 3.0GHz |
| 内存 | 4GB | 8GB 及以上 |
| 硬盘 | 10GB 可用空间 | 50GB 及以上 |
| 显卡 | 支持 WebGL 2.0 | 独立显卡 |

---

## 三、环境安装

### 3.1 安装 Node.js

1. 访问 Node.js 官网：https://nodejs.org/
2. 下载 LTS 版本（推荐 18.x）
3. 运行安装程序，按默认选项安装
4. 验证安装：
```bash
node --version    # 应显示 v18.x.x
npm --version     # 应显示 9.x.x
```

### 3.2 安装 MongoDB

1. 访问 MongoDB 官网：https://www.mongodb.com/try/download/community
2. 下载 MongoDB Community Server
3. 运行安装程序，选择"Complete"安装
4. 勾选"Install MongoDB as a Service"
5. 验证安装：
```bash
mongod --version
```

### 3.3 安装 MinIO

1. 下载 MinIO：https://min.io/download
2. 将 minio.exe 放置到指定目录（如 D:\tool\）
3. 创建数据目录（如 D:\minio-data\）
4. 启动 MinIO：
```bash
minio.exe server D:\minio-data
```
5. 默认访问地址：http://localhost:9000
6. 默认账号密码：minioadmin / minioadmin

---

## 四、项目部署

### 4.1 获取源代码

将项目文件解压到目标目录，项目结构如下：
```
yumaobao-system/
├── yumaobao-frontend/    # 前端项目
├── yumaobao-backend/     # 后端项目
├── nginx.conf            # Nginx 配置
└── start-system.bat      # 一键启动脚本
```

### 4.2 配置后端环境

1. 进入后端目录：
```bash
cd yumaobao-backend
```

2. 安装依赖：
```bash
npm install
```

3. 配置环境变量，编辑 `.env` 文件：
```ini
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=27017
DB_NAME=yumaobao

# JWT配置（请修改为自定义密钥）
JWT_SECRET=your_secure_secret_key
JWT_EXPIRES_IN=24h

# MinIO配置
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# 前端地址
FRONTEND_URL=http://localhost:5173
```

4. 编译 TypeScript：
```bash
npm run build
```

### 4.3 配置前端环境

1. 进入前端目录：
```bash
cd yumaobao-frontend
```

2. 安装依赖：
```bash
npm install
```

---

## 五、启动系统

### 5.1 方式一：一键启动（推荐）

双击运行项目根目录下的 `start-system.bat` 脚本，该脚本会自动：
1. 检查并启动 MongoDB 服务
2. 检查并启动 MinIO 服务
3. 启动后端 API 服务
4. 启动前端开发服务器

### 5.2 方式二：手动启动

**步骤 1：启动 MongoDB**
```bash
# 如果已安装为服务，确保服务已启动
net start MongoDB
```

**步骤 2：启动 MinIO**
```bash
D:\tool\minio.exe server D:\minio-data
```

**步骤 3：启动后端服务**
```bash
cd yumaobao-backend
npm run dev
```

**步骤 4：启动前端服务**
```bash
cd yumaobao-frontend
npm run dev
```

### 5.3 访问系统

- **前端地址**：http://localhost:5173
- **后端 API**：http://localhost:3000
- **MinIO 控制台**：http://localhost:9000

### 5.4 默认账号

| 角色 | 用户名 | 密码 |
|:-----|:-------|:-----|
| 管理员 | admin | admin123 |

---

## 六、生产部署

### 6.1 构建前端

```bash
cd yumaobao-frontend
npm run build
```

构建产物输出至 `dist/` 目录。

### 6.2 Nginx 配置

将 `dist/` 目录部署到 Nginx，参考配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 6.3 启动生产服务

```bash
cd yumaobao-backend
npm run build
npm run start
```

---

## 七、常见问题

### Q1: MongoDB 连接失败
**解决方案**：
- 确认 MongoDB 服务已启动：`net start MongoDB`
- 检查端口 27017 是否被占用

### Q2: MinIO 启动失败
**解决方案**：
- 确认数据目录存在且有写入权限
- 检查端口 9000 是否被占用

### Q3: 模型加载缓慢
**解决方案**：
- 使用 Chrome 或 Edge 浏览器
- 确保显卡驱动为最新版本
- 清除浏览器缓存

### Q4: 二维码扫描无法识别
**解决方案**：
- 确保光线充足
- 保持摄像头与二维码平行
- 清洁摄像头镜头

---

## 八、技术支持

如遇其他问题，请参考项目内的安装指南文档：
- `MONGODB_INSTALL_GUIDE.md` - MongoDB 安装详细指南
- `MinIO_INSTALL_GUIDE.md` - MinIO 安装详细指南

---

**文档版本**：v1.0  
**更新日期**：2026年1月
