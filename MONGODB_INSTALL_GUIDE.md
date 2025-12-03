# Windows MongoDB Community Server 安装配置指南

## 一、下载 MongoDB 安装包
1. 访问 MongoDB 官方下载中心：[MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. 选择 **MongoDB Community Server**
3. 操作系统选择 **Windows**
4. 版本选择最新稳定版
5. 安装包格式选择 **MSI**
6. 点击 **Download** 按钮下载

## 二、安装 MongoDB
1. 双击下载的 `.msi` 文件开始安装
2. 按照安装向导进行操作：
   - 选择 **Complete**（完整安装）选项
   - 勾选 **Install MongoDB as a Service**（将MongoDB安装为服务，开机自动运行）
   - **取消勾选** **Install MongoDB Compass**（可选，图形化工具可后续单独安装）
3. 点击 **Install** 完成安装

## 三、配置环境变量
1. 右键点击「此电脑」→「属性」
2. 点击「高级系统设置」→「环境变量」
3. 在「系统变量」中找到 **Path**，点击「编辑」
4. 点击「新建」，添加 MongoDB 的 bin 目录路径，默认为：
   ```
   C:\Program Files\MongoDB\Server\<version>\bin
   ```
   （将 `<version>` 替换为实际安装的版本号，如 `7.0`）
5. 点击「确定」保存所有设置

## 四、创建数据和日志目录
1. 默认情况下，MongoDB 需要以下目录：
   - 数据目录：`C:\data\db`
   - 日志目录：`C:\data\logs`

2. 使用命令提示符创建这些目录：
   ```cmd
   mkdir C:\data\db
   mkdir C:\data\logs
   ```

## 五、创建配置文件
1. 在 MongoDB 安装目录（如 `C:\Program Files\MongoDB\Server\7.0`）下创建配置文件 `mongod.cfg`
2. 编辑配置文件内容：
   ```yaml
   # 数据库路径
   dbpath=C:\data\db
   
   # 日志输出文件路径
   logpath=C:\data\logs\mongod.log
   
   # 错误日志采用追加模式
   logappend=true
   
   # 启用日志文件
   journal=true
   
   # 端口号（默认27017）
   port=27017
   
   # 绑定IP地址（允许所有IP访问）
   bind_ip=0.0.0.0
   ```

## 六、启动 MongoDB 服务

### 方法1：通过Windows服务启动（推荐）
1. 按下 `Win + R`，输入 `services.msc` 打开服务管理器
2. 找到名为 **MongoDB Server** 或 **MongoDB** 的服务
3. 右键点击，选择「启动」
4. 可以设置为「自动」启动，确保开机自动运行

### 方法2：通过命令行启动
1. 以管理员身份打开命令提示符
2. 输入以下命令启动 MongoDB 服务：
   ```cmd
   net start MongoDB
   ```

## 七、验证安装
1. 打开命令提示符
2. 输入 `mongo` 命令连接到 MongoDB：
   ```cmd
   mongo
   ```

3. 如果成功连接，会看到 MongoDB Shell 提示符：
   ```
   MongoDB shell version v7.0.0
   connecting to: mongodb://127.0.0.1:27017/
   ```

4. 测试基本操作：
   ```javascript
   // 查看当前数据库
   db
   
   // 插入测试数据
   db.test.insertOne({name: "test", value: 1})
   
   // 查询数据
   db.test.find()
   ```

## 八、连接到项目

项目配置已经完成，当 MongoDB 服务启动后，项目会自动连接到：
```
mongodb://localhost:27017/yumaobao
```

## 九、常用命令

- 启动 MongoDB 服务：`net start MongoDB`
- 停止 MongoDB 服务：`net stop MongoDB`
- 连接 MongoDB Shell：`mongo`
- 查看 MongoDB 版本：`mongod --version`

## 十、故障排除

如果出现连接错误，请检查：
1. MongoDB 服务是否正在运行
2. 端口 27017 是否被占用
3. 数据目录是否存在且有读写权限
4. 防火墙是否允许访问 27017 端口

## 十一、图形化工具推荐

- **MongoDB Compass**：官方图形化工具，可单独下载安装
- **Robo 3T**：轻量级 MongoDB 管理工具
- **Studio 3T**：功能强大的 MongoDB IDE