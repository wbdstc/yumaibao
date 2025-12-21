"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongodb_1 = require("../config/mongodb");
const Model_1 = __importDefault(require("../models/Model"));
const Project_1 = __importDefault(require("../models/Project"));
const Floor_1 = __importDefault(require("../models/Floor"));
const fileUploadService_1 = require("../utils/fileUploadService");
const minio_1 = require("../config/minio");
const ifcConversionService_1 = __importDefault(require("../utils/ifcConversionService"));
// 模型轻量化处理工具的导入已移除，因为现在使用MinIO存储
class ModelController {
    // 获取模型列表
    static async getAllModels(req, res) {
        try {
            const { projectId, floorId } = req.query;
            const whereClause = {};
            if (projectId)
                whereClause.projectId = projectId;
            if (floorId)
                whereClause.floorId = floorId;
            // 1. 获取所有模型数据
            const models = await Model_1.default.findAll(whereClause);
            // 2. 提取所有不重复的projectId和floorId
            const projectIds = [...new Set(models.map(model => model.projectId))];
            const floorIds = [...new Set(models.map(model => model.floorId).filter(id => id))];
            // 3. 批量查询项目和楼层信息
            const projects = await Project_1.default.findAll({ id: { $in: projectIds } });
            const floors = await Floor_1.default.findAll({ id: { $in: floorIds } });
            // 4. 创建ID到名称的映射
            const projectMap = new Map(projects.map(project => [project.id, project.name]));
            const floorMap = new Map(floors.map(floor => [floor.id, floor.name]));
            // 5. 处理模型数据，替换ID为名称
            const processedModels = models.map(model => ({
                ...model,
                projectName: projectMap.get(model.projectId) || model.projectId, // 使用实际项目名称，fallback到ID
                floorName: model.floorId ? (floorMap.get(model.floorId) || model.floorId) : '无', // 使用实际楼层名称，fallback到ID或'无'
                fileType: model.format, // 使用format作为fileType
                uploadTime: model.uploadedAt, // 使用uploadedAt作为uploadTime
                status: model.status || 'active' // 确保status字段存在，默认为active
            }));
            return res.status(200).json(processedModels);
        }
        catch (error) {
            console.error('获取模型列表失败:', error);
            return res.status(500).json({ message: '获取模型列表失败', error: String(error) });
        }
    }
    // 根据ID获取模型
    static async getModelById(req, res) {
        try {
            const { id } = req.params;
            const model = await Model_1.default.findById(id);
            if (!model) {
                return res.status(404).json({ message: '模型不存在' });
            }
            return res.status(200).json(model);
        }
        catch (error) {
            console.error('获取模型失败:', error);
            return res.status(500).json({ message: '获取模型失败', error: String(error) });
        }
    }
    // 上传模型文件
    static async uploadModel(req, res) {
        try {
            const { projectId, floorId, name, type, description, version, isLightweight } = req.body;
            const userId = req.user?.id;
            const file = req.file;
            if (!userId) {
                return res.status(401).json({ message: '未授权' });
            }
            if (!file) {
                return res.status(400).json({ message: '未上传文件' });
            }
            // 上传文件到MinIO
            const { url: fileUrl, objectName } = await (0, fileUploadService_1.uploadFileToMinIO)(minio_1.MINIO_BUCKETS.MODELS, file);
            // 保存原始文件名到MongoDB
            const db = (0, mongodb_1.getDB)();
            let fileRecord = null;
            if (db) {
                fileRecord = await db.collection('modelFiles').insertOne({
                    modelId: '', // 稍后更新
                    originalFilename: file.originalname,
                    objectName,
                    bucketName: minio_1.MINIO_BUCKETS.MODELS,
                    createdAt: new Date()
                });
            }
            // 保存模型元数据到MongoDB
            const originalModelFormat = path_1.default.extname(file.originalname).toLowerCase().substring(1);
            // 准备模型数据
            const modelData = {
                projectId,
                floorId,
                name: name || file.originalname,
                type: type,
                fileUrl,
                fileSize: file.size,
                format: originalModelFormat,
                version: version || '1.0',
                uploadedBy: userId,
                description,
                isLightweight: isLightweight !== false
            };
            // 如果是IFC文件，自动转换并只保留转换后的文件
            if (originalModelFormat === 'ifc') {
                console.log('检测到IFC文件，开始自动转换流程');
                try {
                    // 调用IFC自动转换方法
                    console.log('调用autoConvertIFCIfNeeded方法');
                    const autoConversionResult = await this.autoConvertIFCIfNeeded(file, modelData);
                    console.log('autoConvertIFCIfNeeded返回结果:', autoConversionResult);
                    if (autoConversionResult && autoConversionResult.fileUrl && autoConversionResult.fileSize !== undefined) {
                        console.log('自动转换成功，创建转换后的模型记录');
                        // 直接保存转换后的模型记录，不保存原始IFC文件
                        const convertedModel = await Model_1.default.create({
                            projectId: modelData.projectId,
                            floorId: modelData.floorId,
                            name: modelData.name || file.originalname.replace(/\.ifc$/i, `_converted.${autoConversionResult.format}`),
                            type: '3d',
                            fileUrl: autoConversionResult.fileUrl,
                            fileSize: autoConversionResult.fileSize,
                            format: autoConversionResult.format,
                            version: modelData.version || '1.0',
                            uploadedBy: modelData.uploadedBy,
                            description: `${modelData.description || ''} [IFC自动转换]`
                        });
                        // 删除原始IFC文件记录（如果存在）
                        if (db && fileRecord) {
                            console.log('删除原始IFC文件记录');
                            await db.collection('modelFiles').deleteOne({ _id: fileRecord.insertedId });
                        }
                        // 删除原始IFC文件
                        const originalObjectName = fileUrl.split('/').pop();
                        if (originalObjectName) {
                            console.log('删除原始IFC文件:', originalObjectName);
                            await (0, fileUploadService_1.deleteFileFromMinIO)(minio_1.MINIO_BUCKETS.MODELS, originalObjectName);
                        }
                        console.log('IFC模型自动转换成功，返回结果');
                        return res.status(201).json({
                            message: 'IFC模型自动转换成功',
                            data: {
                                originalModel: null,
                                convertedModel,
                                conversionResult: {
                                    success: true,
                                    convertedModel
                                }
                            }
                        });
                    }
                    else {
                        console.log('自动转换失败，保存原始模型');
                        // 转换失败，保存原始模型
                        const model = await Model_1.default.create(modelData);
                        if (db && fileRecord) {
                            await db.collection('modelFiles').updateOne({ _id: fileRecord.insertedId }, { $set: { modelId: model.id } });
                        }
                        return res.status(201).json({
                            message: '模型上传成功（IFC自动转换失败）',
                            data: {
                                originalModel: model,
                                convertedModel: null,
                                conversionResult: {
                                    success: false,
                                    message: 'IFC自动转换失败',
                                    details: autoConversionResult
                                }
                            }
                        });
                    }
                }
                catch (error) {
                    console.error('自动转换IFC失败:', error);
                    // 转换失败，保存原始模型
                    const model = await Model_1.default.create(modelData);
                    if (db && fileRecord) {
                        await db.collection('modelFiles').updateOne({ _id: fileRecord.insertedId }, { $set: { modelId: model.id } });
                    }
                    return res.status(201).json({
                        message: '模型上传成功（IFC自动转换失败）',
                        data: {
                            originalModel: model,
                            convertedModel: null,
                            conversionResult: {
                                success: false,
                                message: 'IFC自动转换失败',
                                error: String(error)
                            }
                        }
                    });
                }
            }
            else {
                // 非IFC文件，保存原始模型
                const model = await Model_1.default.create(modelData);
                if (db && fileRecord) {
                    await db.collection('modelFiles').updateOne({ _id: fileRecord.insertedId }, { $set: { modelId: model.id } });
                }
                return res.status(201).json({
                    message: '模型上传成功',
                    data: {
                        originalModel: model,
                        convertedModel: null,
                        conversionResult: null
                    }
                });
            }
        }
        catch (error) {
            console.error('上传模型失败:', error);
            return res.status(500).json({ message: '上传模型失败', error: String(error) });
        }
    }
    // 模型轻量化处理
    static async processLightweightModel(originalFilePath, originalFilename) {
        const fileExtension = path_1.default.extname(originalFilename).toLowerCase();
        const baseName = path_1.default.basename(originalFilename, fileExtension);
        const lightweightFilename = `${baseName}_light${fileExtension}`;
        const lightweightPath = path_1.default.join(__dirname, '../../uploads/models', lightweightFilename);
        try {
            // 根据文件类型选择不同的轻量化处理方式
            if (fileExtension === '.dwg' || fileExtension === '.dxf') {
                // 对于DWG/DXF文件，使用CAD文件处理工具进行轻量化
                console.log('开始DWG/DXF文件轻量化处理...');
                // 提取CAD文件信息
                const cadInfo = await this.extractCADFileInfo();
                console.log('CAD文件信息:', cadInfo);
                // 模拟轻量化处理
                await this.simulateCADLightweightProcess(originalFilePath, lightweightPath, cadInfo);
            }
            else if (fileExtension === '.ifc' || fileExtension === '.rvt' || fileExtension === '.nwd') {
                // 对于BIM模型文件，使用专门的BIM轻量化工具
                console.log('开始BIM模型轻量化处理...');
                // 提取BIM模型信息
                const bimInfo = await this.extractBIMModelInfo();
                console.log('BIM模型信息:', bimInfo);
                // 模拟轻量化处理
                await this.simulateBIMLightweightProcess(originalFilePath, lightweightPath, bimInfo);
            }
            else {
                // 对于其他文件类型，直接复制作为轻量化版本
                fs_1.default.copyFileSync(originalFilePath, lightweightPath);
                console.log(`不支持的文件类型，直接复制原始文件作为轻量化版本: ${fileExtension}`);
            }
            return lightweightPath;
        }
        catch (error) {
            console.error('模型轻量化处理失败:', error);
            // 如果轻量化处理失败，返回原始文件路径
            return originalFilePath;
        }
    }
    // 提取CAD文件信息
    static async extractCADFileInfo() {
        // 模拟提取CAD文件信息
        // 实际项目中应使用专业的CAD文件处理库
        return {
            format: 'CAD',
            version: 'AutoCAD 2023',
            layers: Math.floor(Math.random() * 50) + 10, // 10-60个图层
            entities: Math.floor(Math.random() * 500) + 100, // 100-600个实体
            units: 'mm',
            author: 'CAD Designer',
            createdDate: new Date().toISOString()
        };
    }
    // 提取BIM模型信息
    static async extractBIMModelInfo() {
        // 模拟提取BIM模型信息
        // 实际项目中应使用专业的BIM文件处理库
        return {
            format: 'BIM',
            schemaVersion: 'IFC4',
            buildingElements: Math.floor(Math.random() * 1000) + 500, // 500-1500个建筑元素
            levels: Math.floor(Math.random() * 20) + 5, // 5-25个楼层
            materials: Math.floor(Math.random() * 100) + 20, // 20-120种材料
            projectName: 'Sample Building Project',
            author: 'BIM Modeler',
            createdDate: new Date().toISOString()
        };
    }
    // 模拟CAD文件轻量化处理
    static async simulateCADLightweightProcess(originalPath, outputPath, cadInfo) {
        return new Promise((resolve, reject) => {
            // 模拟轻量化处理耗时
            setTimeout(() => {
                try {
                    // 复制文件作为模拟
                    fs_1.default.copyFileSync(originalPath, outputPath);
                    // 模拟生成轻量化报告
                    const lightweightReport = {
                        originalSize: fs_1.default.statSync(originalPath).size,
                        lightweightSize: Math.floor(fs_1.default.statSync(originalPath).size * 0.6), // 模拟减少40%的文件大小
                        processedTime: '2.5 seconds',
                        compressionRatio: '60%',
                        retainedLayers: Math.floor(cadInfo.layers * 0.8), // 保留80%的图层
                        retainedEntities: Math.floor(cadInfo.entities * 0.7), // 保留70%的实体
                        status: 'success'
                    };
                    console.log('CAD文件轻量化处理完成:', lightweightReport);
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            }, 2000);
        });
    }
    // 模拟BIM模型轻量化处理
    static async simulateBIMLightweightProcess(originalPath, outputPath, bimInfo) {
        return new Promise((resolve, reject) => {
            // 模拟轻量化处理耗时
            setTimeout(() => {
                try {
                    // 复制文件作为模拟
                    fs_1.default.copyFileSync(originalPath, outputPath);
                    // 模拟生成轻量化报告
                    const lightweightReport = {
                        originalSize: fs_1.default.statSync(originalPath).size,
                        lightweightSize: Math.floor(fs_1.default.statSync(originalPath).size * 0.5), // 模拟减少50%的文件大小
                        processedTime: '4.2 seconds',
                        compressionRatio: '50%',
                        retainedElements: Math.floor(bimInfo.buildingElements * 0.85), // 保留85%的建筑元素
                        retainedLevels: bimInfo.levels, // 保留所有楼层
                        status: 'success'
                    };
                    console.log('BIM模型轻量化处理完成:', lightweightReport);
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            }, 3000);
        });
    }
    // 更新模型信息
    static async updateModel(req, res) {
        try {
            const { id } = req.params;
            const { name, floorId, description, metadata } = req.body;
            const model = await Model_1.default.findById(id);
            if (!model) {
                return res.status(404).json({ message: '模型不存在' });
            }
            const updateData = {
                name,
                floorId,
                description,
                metadata
            };
            const updatedModel = await Model_1.default.update(id, updateData);
            return res.status(200).json({ message: '模型更新成功', data: updatedModel });
        }
        catch (error) {
            console.error('更新模型失败:', error);
            return res.status(500).json({ message: '更新模型失败', error: String(error) });
        }
    }
    // 删除模型
    static async deleteModel(req, res) {
        try {
            const { id } = req.params;
            const model = await Model_1.default.findById(id);
            if (!model) {
                return res.status(404).json({ message: '模型不存在' });
            }
            // 删除MongoDB中的文件记录
            const db = (0, mongodb_1.getDB)();
            if (db) {
                const fileRecord = await db.collection('modelFiles').findOne({ modelId: id });
                if (fileRecord) {
                    // 从MinIO删除文件
                    await (0, fileUploadService_1.deleteFileFromMinIO)(fileRecord.bucketName, fileRecord.objectName);
                    // 删除文件记录
                    await db.collection('modelFiles').deleteOne({ modelId: id });
                }
            }
            // 删除MongoDB中的模型记录
            await Model_1.default.delete(id);
            return res.status(200).json({ message: '模型删除成功' });
        }
        catch (error) {
            console.error('删除模型失败:', error);
            return res.status(500).json({ message: '删除模型失败', error: String(error) });
        }
    }
    // 根据项目获取模型
    static async getModelsByProject(req, res) {
        try {
            const { projectId } = req.params;
            const models = await Model_1.default.findByProjectId(projectId);
            return res.status(200).json(models);
        }
        catch (error) {
            console.error('根据项目获取模型失败:', error);
            return res.status(500).json({ message: '根据项目获取模型失败', error: String(error) });
        }
    }
    // 下载模型文件
    static async downloadModel(req, res) {
        try {
            const { id } = req.params;
            const model = await Model_1.default.findById(id);
            if (!model) {
                return res.status(404).json({ message: '模型不存在' });
            }
            // 获取文件记录
            const db = (0, mongodb_1.getDB)();
            if (!db) {
                return res.status(500).json({ message: '数据库连接失败' });
            }
            const fileRecord = await db.collection('modelFiles').findOne({ modelId: id });
            if (!fileRecord) {
                return res.status(404).json({ message: '文件记录不存在' });
            }
            // 从MinIO下载文件
            const fileBuffer = await (0, fileUploadService_1.downloadFileFromMinIO)(fileRecord.bucketName, fileRecord.objectName);
            // 设置响应头并下载文件
            res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalFilename.replace(/"/g, '\\"')}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Length', fileBuffer.length);
            return res.send(fileBuffer);
        }
        catch (error) {
            console.error('下载模型失败:', error);
            return res.status(500).json({ message: '下载模型失败', error: String(error) });
        }
    }
    // 获取缩略图
    static async getThumbnail(req, res) {
        try {
            const { id } = req.params;
            const model = await Model_1.default.findById(id);
            if (!model || !model.thumbnailUrl) {
                return res.status(404).json({ message: '缩略图不存在' });
            }
            // 从MinIO下载缩略图
            const db = (0, mongodb_1.getDB)();
            if (!db) {
                return res.status(500).json({ message: '数据库连接失败' });
            }
            // 查找缩略图文件记录
            const fileRecord = await db.collection('modelFiles').findOne({ modelId: id });
            if (!fileRecord) {
                return res.status(404).json({ message: '缩略图文件记录不存在' });
            }
            // 从MinIO下载文件
            const fileBuffer = await (0, fileUploadService_1.downloadFileFromMinIO)(fileRecord.bucketName, fileRecord.objectName);
            // 设置响应头并返回文件
            res.setHeader('Content-Type', 'image/png'); // 假设缩略图是PNG格式
            res.setHeader('Content-Length', fileBuffer.length);
            return res.send(fileBuffer);
        }
        catch (error) {
            console.error('获取缩略图失败:', error);
            return res.status(500).json({ message: '获取缩略图失败', error: String(error) });
        }
    }
    // 转换IFC模型
    static async convertIFCModel(req, res) {
        const startTime = Date.now();
        const { id } = req.params;
        const logPrefix = `[IFC转换请求] 模型ID: ${id}`;
        try {
            console.log(`${logPrefix} 开始处理转换请求`);
            const { outputFormat = 'glb', isLightweight = true, quality = 80 } = req.body;
            console.log(`${logPrefix} 请求参数:`, { outputFormat, isLightweight, quality });
            // 1. 获取模型信息
            console.log(`${logPrefix} 步骤1: 获取模型信息`);
            let model;
            try {
                model = await Model_1.default.findById(id);
                if (!model) {
                    console.log(`${logPrefix} 模型不存在，ID: ${id}`);
                    return res.status(404).json({ message: '模型不存在' });
                }
                console.log(`${logPrefix} 找到模型: ${model.name}, 格式: ${model.format}`);
            }
            catch (modelError) {
                console.error(`${logPrefix} 获取模型信息失败:`, modelError);
                return res.status(500).json({
                    message: '获取模型信息失败',
                    error: String(modelError)
                });
            }
            // 2. 检查是否为IFC文件
            console.log(`${logPrefix} 步骤2: 检查文件格式`);
            if (model.format !== 'ifc') {
                console.log(`${logPrefix} 非IFC格式文件，格式: ${model.format}`);
                return res.status(400).json({
                    message: '仅支持IFC格式文件的转换',
                    currentFormat: model.format
                });
            }
            // 3. 获取文件记录
            console.log(`${logPrefix} 步骤3: 获取文件记录`);
            const db = (0, mongodb_1.getDB)();
            if (!db) {
                console.error(`${logPrefix} 数据库连接失败`);
                return res.status(500).json({ message: '数据库连接失败' });
            }
            let fileRecord;
            try {
                fileRecord = await db.collection('modelFiles').findOne({ modelId: id });
                if (!fileRecord) {
                    console.log(`${logPrefix} 文件记录不存在，模型ID: ${id}`);
                    return res.status(404).json({ message: '文件记录不存在' });
                }
                console.log(`${logPrefix} 找到文件记录: ${fileRecord.originalFilename}`);
            }
            catch (fileRecordError) {
                console.error(`${logPrefix} 获取文件记录失败:`, fileRecordError);
                return res.status(500).json({
                    message: '获取文件记录失败',
                    error: String(fileRecordError)
                });
            }
            // 4. 从MinIO下载文件到临时目录
            console.log(`${logPrefix} 步骤4: 下载文件到临时目录`);
            const tempDir = path_1.default.join(__dirname, '../../temp');
            if (!fs_1.default.existsSync(tempDir)) {
                console.log(`${logPrefix} 创建临时目录: ${tempDir}`);
                fs_1.default.mkdirSync(tempDir, { recursive: true });
            }
            const tempFilePath = path_1.default.join(tempDir, fileRecord.originalFilename);
            console.log(`${logPrefix} 临时文件路径: ${tempFilePath}`);
            let fileBuffer;
            try {
                fileBuffer = await (0, fileUploadService_1.downloadFileFromMinIO)(fileRecord.bucketName, fileRecord.objectName);
                console.log(`${logPrefix} 文件下载成功，大小: ${fileBuffer.length}字节`);
                fs_1.default.writeFileSync(tempFilePath, fileBuffer);
                console.log(`${logPrefix} 文件写入临时目录成功`);
            }
            catch (downloadError) {
                console.error(`${logPrefix} 文件下载或写入失败:`, downloadError);
                return res.status(500).json({
                    message: '文件下载或写入失败',
                    error: String(downloadError)
                });
            }
            try {
                // 5. 执行IFC转换
                console.log(`${logPrefix} 步骤5: 执行IFC转换`);
                const conversionResult = await ifcConversionService_1.default.convertIFC({
                    inputFile: tempFilePath,
                    outputFormat: outputFormat,
                    isLightweight,
                    quality,
                    includeMaterials: true,
                    includeTextures: true
                });
                console.log(`${logPrefix} 转换结果:`, conversionResult);
                if (!conversionResult.success) {
                    console.error(`${logPrefix} IFC转换失败: ${conversionResult.message}`);
                    return res.status(500).json({
                        message: 'IFC转换失败',
                        error: conversionResult.message,
                        details: conversionResult
                    });
                }
                // 6. 创建转换后的模型记录
                console.log(`${logPrefix} 步骤6: 创建转换后的模型记录`);
                if (!conversionResult.outputUrl || conversionResult.convertedSize === undefined) {
                    console.error(`${logPrefix} IFC转换失败，转换结果不完整`);
                    return res.status(500).json({
                        message: 'IFC转换失败，转换结果不完整',
                        conversionResult
                    });
                }
                let convertedModel;
                try {
                    convertedModel = await Model_1.default.create({
                        projectId: model.projectId,
                        floorId: model.floorId,
                        name: `${model.name}_converted`,
                        type: '3d',
                        fileUrl: conversionResult.outputUrl,
                        fileSize: conversionResult.convertedSize,
                        format: outputFormat,
                        version: model.version,
                        uploadedBy: model.uploadedBy,
                        description: `${model.description || ''} [IFC转换]`,
                        parentModelId: model.id
                    });
                    console.log(`${logPrefix} 转换后的模型记录创建成功，ID: ${convertedModel.id}`);
                }
                catch (modelCreateError) {
                    console.error(`${logPrefix} 创建转换后模型记录失败:`, modelCreateError);
                    return res.status(500).json({
                        message: '创建转换后模型记录失败',
                        error: String(modelCreateError)
                    });
                }
                // 7. 保存转换后的文件记录
                console.log(`${logPrefix} 步骤7: 保存转换后的文件记录`);
                try {
                    await db.collection('modelFiles').insertOne({
                        modelId: convertedModel.id,
                        originalFilename: path_1.default.basename(conversionResult.outputFile),
                        objectName: conversionResult.objectName,
                        bucketName: minio_1.MINIO_BUCKETS.MODELS,
                        createdAt: new Date()
                    });
                    console.log(`${logPrefix} 转换后的文件记录保存成功`);
                }
                catch (fileRecordError) {
                    console.error(`${logPrefix} 保存转换后文件记录失败:`, fileRecordError);
                    // 继续执行，不影响主要结果
                }
                const totalTime = Date.now() - startTime;
                console.log(`${logPrefix} IFC转换请求处理完成，耗时: ${totalTime}ms`);
                return res.status(200).json({
                    message: 'IFC转换成功',
                    data: {
                        convertedModel,
                        conversionResult,
                        totalTime
                    }
                });
            }
            finally {
                // 8. 清理临时文件
                console.log(`${logPrefix} 步骤8: 清理临时文件`);
                try {
                    if (fs_1.default.existsSync(tempFilePath)) {
                        fs_1.default.unlinkSync(tempFilePath);
                        console.log(`${logPrefix} 临时文件清理成功: ${tempFilePath}`);
                    }
                }
                catch (cleanupError) {
                    console.error(`${logPrefix} 临时文件清理失败:`, cleanupError);
                    // 清理失败不影响结果，继续执行
                }
            }
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            console.error(`${logPrefix} 转换IFC模型失败，耗时: ${totalTime}ms`);
            console.error(`${logPrefix} 错误信息: ${errorMessage}`);
            console.error(`${logPrefix} 错误堆栈:`, errorStack);
            return res.status(500).json({
                message: '转换IFC模型失败',
                error: errorMessage,
                stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
                totalTime
            });
        }
    }
    // 检查IFC转换服务状态
    static async checkIFCConversionStatus(_req, res) {
        try {
            const isAvailable = ifcConversionService_1.default.isIfcOpenShellAvailable();
            return res.status(200).json({
                success: true,
                isAvailable,
                message: isAvailable ? 'IFC转换服务可用' : 'IFC转换服务不可用'
            });
        }
        catch (error) {
            console.error('检查IFC转换服务状态失败:', error);
            return res.status(500).json({
                success: false,
                isAvailable: false,
                message: '检查IFC转换服务状态失败'
            });
        }
    }
    // 上传模型文件时自动转换IFC
    static async autoConvertIFCIfNeeded(file, modelData) {
        if (path_1.default.extname(file.originalname).toLowerCase() === '.ifc') {
            // 创建临时文件
            const tempDir = path_1.default.join(__dirname, '../../temp');
            if (!fs_1.default.existsSync(tempDir)) {
                fs_1.default.mkdirSync(tempDir, { recursive: true });
            }
            const tempFilePath = path_1.default.join(tempDir, file.originalname);
            fs_1.default.writeFileSync(tempFilePath, file.buffer);
            try {
                // 执行IFC转换
                const conversionResult = await ifcConversionService_1.default.convertIFC({
                    inputFile: tempFilePath,
                    outputFormat: 'glb',
                    isLightweight: modelData.isLightweight !== false,
                    quality: 80,
                    includeMaterials: true,
                    includeTextures: true
                });
                if (conversionResult.success && conversionResult.outputUrl) {
                    // 返回转换后的URL和格式
                    return {
                        converted: true,
                        fileUrl: conversionResult.outputUrl,
                        format: 'glb',
                        fileSize: conversionResult.convertedSize
                    };
                }
            }
            catch (error) {
                console.error('自动转换IFC失败:', error);
                // 自动转换失败，返回原始文件信息
            }
            finally {
                // 清理临时文件
                if (fs_1.default.existsSync(tempFilePath)) {
                    fs_1.default.unlinkSync(tempFilePath);
                }
            }
        }
        // 不是IFC文件或转换失败，返回null
        return null;
    }
}
exports.default = ModelController;
