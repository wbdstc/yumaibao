# MinIO安装和启动指南（Windows系统）

本文档将指导您如何在Windows系统上安装、配置和启动MinIO服务，以解决预埋宝系统的MinIO连接失败问题。

## 步骤1：解压MinIO安装包

1. 将下载的MinIO安装包解压到一个合适的目录，例如：
   ```
   D:\minio
   ```

2. 解压后，您应该能看到`minio.exe`文件（Windows系统）。

## 步骤2：创建数据存储目录

创建一个用于存储MinIO数据的目录，例如：
```
D:\minio-data
```

## 步骤3：启动MinIO服务

### 方法1：使用命令行启动（推荐用于开发环境）

1. 打开Windows命令提示符（CMD）或PowerShell。

2. 导航到MinIO的安装目录：
   ```bash
   cd D:\minio
   ```

3. 使用以下命令启动MinIO服务：
   ```bash
   minio.exe server D:\minio-data --console-address :9090
   ```

   这将：
   - 在9000端口启动MinIO API服务
   - 在9090端口启动MinIO控制台
   - 使用D:\minio-data作为数据存储目录

4. 启动成功后，您将看到类似以下输出：
   ```
   API: http://192.168.1.100:9000  http://127.0.0.1:9000
   RootUser: minioadmin
   RootPass: minioadmin
   Console: http://192.168.1.100:9090 http://127.0.0.1:9090
   ```

### 方法2：配置为Windows服务（推荐用于生产环境）

1. 下载NSSM（Non-Sucking Service Manager）工具：
   [NSSM官方下载页面](https://nssm.cc/download)

2. 解压NSSM到一个目录，例如：
   ```
   D:\nssm
   ```

3. 以管理员身份打开命令提示符，导航到NSSM目录：
   ```bash
   cd D:\nssm\win64
   ```

4. 使用以下命令安装MinIO为Windows服务：
   ```bash
   nssm install MinIO
   ```

5. 在弹出的NSSM窗口中配置：
   - **Path**: 选择MinIO的安装路径，例如：`D:\minio\minio.exe`
   - **Startup directory**: 选择MinIO的安装目录，例如：`D:\minio`
   - **Arguments**: 输入启动参数，例如：`server D:\minio-data --console-address :9090`
   - 切换到**Details**选项卡，设置服务名称为"MinIO"
   - 切换到**Log On**选项卡，选择"Local System account"
   - 切换到**Dependencies**选项卡，可以添加依赖项（可选）
   - 点击**Install service**按钮安装服务

6. 启动MinIO服务：
   ```bash
   nssm start MinIO
   ```

## 步骤4：访问MinIO控制台

1. 打开浏览器，访问MinIO控制台地址：
   ```
   http://localhost:9090
   ```

2. 使用默认的根凭证登录：
   - **用户名**: minioadmin
   - **密码**: minioadmin

## 步骤5：创建必要的存储桶

预埋宝系统需要以下存储桶：
- models
- reports
- qrcodes
- uploads

1. 在MinIO控制台中，点击左侧的"Buckets"菜单。
2. 点击"Create Bucket"按钮。
3. 输入存储桶名称（例如：models），点击"Create Bucket"。
4. 重复上述步骤，创建所有必要的存储桶。

## 步骤6：验证预埋宝系统与MinIO的连接

1. 确保MinIO服务正在运行。
2. 启动预埋宝后端服务：
   ```bash
   cd d:/code/cad-viewer-main/yumaobao-backend
   npm run dev
   ```

3. 检查服务器启动日志，确认MinIO存储桶初始化成功：
   ```
   MongoDB数据库连接成功
   MinIO存储桶初始化成功
   服务器已启动，监听端口 3000
   ```

## 步骤7：配置MinIO（可选）

如果需要修改MinIO的默认配置，可以编辑预埋宝系统的`.env`文件：

```env
# MinIO配置
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

## 常见问题排查

1. **连接被拒绝**：
   - 确保MinIO服务正在运行
   - 检查防火墙是否阻止了9000端口的访问

2. **认证失败**：
   - 确保`.env`文件中的`MINIO_ACCESS_KEY`和`MINIO_SECRET_KEY`与MinIO的配置一致

3. **存储桶创建失败**：
   - 确保MinIO用户有足够的权限创建存储桶
   - 检查网络连接是否正常

## 参考链接

- [MinIO官方文档](https://min.io/docs/minio/windows/index.html)
- [NSSM官方文档](https://nssm.cc/documentation)

如果您在安装和配置过程中遇到任何问题，请参考上述官方文档或联系技术支持。