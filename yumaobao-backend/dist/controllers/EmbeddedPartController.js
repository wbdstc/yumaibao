"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EmbeddedPart_1 = __importDefault(require("../models/EmbeddedPart"));
const uuid_1 = require("uuid");
const qrcode_1 = __importDefault(require("qrcode"));
const xlsx_1 = __importDefault(require("xlsx"));
const path_1 = __importDefault(require("path"));
const mongodb_1 = require("../config/mongodb");
const fileUploadService_1 = require("../utils/fileUploadService");
class EmbeddedPartController {
    // 获取所有预埋件
    static async getAllEmbeddedParts(req, res) {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const pageNum = Number(page);
            const limitNum = Number(limit);
            const skip = (pageNum - 1) * limitNum;
            // 构建查询条件
            const whereClause = {};
            if (search) {
                whereClause.name = { $regex: search, $options: 'i' };
            }
            const db = (0, mongodb_1.getDB)();
            if (!db) {
                return res.status(500).json({ message: '数据库连接失败' });
            }
            // 执行查询 - 使用与模型一致的集合名称
            const collection = db.collection('embedded_parts');
            const [rows, total] = await Promise.all([
                collection.find(whereClause).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
                collection.countDocuments(whereClause)
            ]);
            return res.status(200).json({
                total,
                pages: Math.ceil(total / limitNum),
                currentPage: pageNum,
                data: rows
            });
        }
        catch (error) {
            console.error('获取预埋件列表失败:', error);
            return res.status(500).json({ message: '获取预埋件列表失败', error: String(error) });
        }
    }
    // 根据ID获取预埋件
    static async getEmbeddedPartById(req, res) {
        try {
            const { id } = req.params;
            const embeddedPart = await EmbeddedPart_1.default.findById(id);
            if (!embeddedPart) {
                return res.status(404).json({ message: '预埋件不存在' });
            }
            return res.status(200).json(embeddedPart);
        }
        catch (error) {
            console.error('获取预埋件详情失败:', error);
            return res.status(500).json({ message: '获取预埋件详情失败', error: String(error) });
        }
    }
    // 创建单个预埋件
    static async createEmbeddedPart(req, res) {
        try {
            const { projectId, name, type, modelNumber, description, location, coordinates } = req.body;
            // 生成二维码数据
            const qrCodeData = `${projectId}-${(0, uuid_1.v4)()}`;
            // 生成二维码图片到内存
            const qrCodeBuffer = await qrcode_1.default.toBuffer(qrCodeData);
            const qrCodeFileName = `${qrCodeData}.png`;
            // 上传到MinIO
            const { url: qrCodeUrl } = await (0, fileUploadService_1.uploadFileToMinIO)('qrcodes', {
                buffer: qrCodeBuffer,
                originalname: qrCodeFileName,
                mimetype: 'image/png',
                size: qrCodeBuffer.length,
                fieldname: 'qrcode',
                encoding: '7bit',
                stream: null,
                destination: '',
                filename: qrCodeFileName,
                path: ''
            });
            const embeddedPart = await EmbeddedPart_1.default.create({
                id: (0, uuid_1.v4)(),
                projectId,
                name,
                type,
                modelNumber,
                description,
                location,
                coordinates,
                qrCodeData,
                qrCodeUrl,
                status: 'pending'
            });
            return res.status(201).json({ message: '预埋件创建成功', data: embeddedPart });
        }
        catch (error) {
            console.error('创建预埋件失败:', error);
            return res.status(500).json({ message: '创建预埋件失败', error: String(error) });
        }
    }
    // 批量创建预埋件
    static async batchCreateEmbeddedParts(req, res) {
        try {
            const parts = req.body;
            const createdParts = [];
            for (const part of parts) {
                const { projectId, name, type, modelNumber, description, location, coordinates } = part;
                // 生成二维码数据
                const qrCodeData = `${projectId}-${(0, uuid_1.v4)()}`;
                // 生成二维码图片到内存
                const qrCodeBuffer = await qrcode_1.default.toBuffer(qrCodeData);
                const qrCodeFileName = `${qrCodeData}.png`;
                // 上传到MinIO
                const { url: qrCodeUrl } = await (0, fileUploadService_1.uploadFileToMinIO)('qrcodes', {
                    buffer: qrCodeBuffer,
                    originalname: qrCodeFileName,
                    mimetype: 'image/png',
                    size: qrCodeBuffer.length,
                    fieldname: 'qrcode',
                    encoding: '7bit',
                    stream: null,
                    destination: '',
                    filename: qrCodeFileName,
                    path: ''
                });
                const embeddedPart = await EmbeddedPart_1.default.create({
                    projectId,
                    name,
                    type,
                    modelNumber,
                    description,
                    location,
                    coordinates,
                    qrCodeData,
                    qrCodeUrl
                });
                createdParts.push(embeddedPart);
            }
            return res.status(201).json({ message: '预埋件批量创建成功', data: createdParts });
        }
        catch (error) {
            console.error('批量创建预埋件失败:', error);
            return res.status(500).json({ message: '批量创建预埋件失败', error: String(error) });
        }
    }
    // 从Excel导入预埋件
    static async importEmbeddedParts(req, res) {
        try {
            const file = req.file;
            const { projectId } = req.body;
            if (!file) {
                return res.status(400).json({ message: '未上传文件' });
            }
            if (!projectId) {
                return res.status(400).json({ message: '项目ID不能为空' });
            }
            // 读取Excel文件
            const workbook = xlsx_1.default.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx_1.default.utils.sheet_to_json(worksheet);
            const importedParts = [];
            const errors = [];
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                try {
                    // 验证必填字段
                    if (!row.name || !row.type || !row.modelNumber || !row.location || !row.coordinates) {
                        errors.push({ row: i + 2, message: '缺少必填字段' });
                        continue;
                    }
                    // 解析坐标
                    let coordinates;
                    if (typeof row.coordinates === 'string') {
                        coordinates = JSON.parse(row.coordinates);
                    }
                    else {
                        coordinates = row.coordinates;
                    }
                    // 生成二维码数据
                    const qrCodeData = `${projectId}-${(0, uuid_1.v4)()}`;
                    // 生成二维码图片到内存
                    const qrCodeBuffer = await qrcode_1.default.toBuffer(qrCodeData);
                    const qrCodeFileName = `${qrCodeData}.png`;
                    // 上传到MinIO
                    const { url: qrCodeUrl } = await (0, fileUploadService_1.uploadFileToMinIO)('qrcodes', {
                        buffer: qrCodeBuffer,
                        originalname: qrCodeFileName,
                        mimetype: 'image/png',
                        size: qrCodeBuffer.length,
                        fieldname: 'qrcode',
                        encoding: '7bit',
                        stream: null,
                        destination: '',
                        filename: qrCodeFileName,
                        path: ''
                    });
                    const embeddedPart = await EmbeddedPart_1.default.create({
                        projectId,
                        name: row.name,
                        type: row.type,
                        modelNumber: row.modelNumber,
                        description: row.description || '',
                        location: row.location,
                        coordinates,
                        qrCodeData,
                        qrCodeUrl
                    });
                    importedParts.push(embeddedPart);
                }
                catch (err) {
                    errors.push({ row: i + 2, message: String(err) });
                }
            }
            return res.status(200).json({
                message: '预埋件导入完成',
                importedCount: importedParts.length,
                errorCount: errors.length,
                errors,
                data: importedParts
            });
        }
        catch (error) {
            console.error('导入预埋件失败:', error);
            return res.status(500).json({ message: '导入预埋件失败', error: String(error) });
        }
    }
    // 更新预埋件信息
    static async updateEmbeddedPart(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const embeddedPart = await EmbeddedPart_1.default.findById(id);
            if (!embeddedPart) {
                return res.status(404).json({ message: '预埋件不存在' });
            }
            // MongoDB可以直接存储对象，不需要转换为JSON字符串
            updateData.updatedAt = new Date();
            const updatedPart = await EmbeddedPart_1.default.update(id, updateData);
            return res.status(200).json({ message: '预埋件更新成功', data: updatedPart });
        }
        catch (error) {
            console.error('更新预埋件失败:', error);
            return res.status(500).json({ message: '更新预埋件失败', error: String(error) });
        }
    }
    // 批量更新状态
    static async batchUpdateStatus(req, res) {
        try {
            const { ids, status, notes } = req.body;
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: '未授权' });
            }
            // 更新状态
            const updateData = {
                status: status
            };
            if (status === 'installed') {
                updateData.installationDate = new Date();
            }
            else if (status === 'inspected' || status === 'rejected') {
                updateData.inspectorId = userId;
                updateData.inspectionDate = new Date();
            }
            if (notes) {
                updateData.notes = notes;
            }
            const result = await EmbeddedPart_1.default.batchUpdate(ids, updateData);
            return res.status(200).json({ message: `成功更新 ${result} 个预埋件状态` });
        }
        catch (error) {
            console.error('批量更新预埋件状态失败:', error);
            return res.status(500).json({ message: '批量更新预埋件状态失败', error: String(error) });
        }
    }
    // 删除预埋件
    static async deleteEmbeddedPart(req, res) {
        try {
            const { id } = req.params;
            const embeddedPart = await EmbeddedPart_1.default.findById(id);
            if (!embeddedPart) {
                return res.status(404).json({ message: '预埋件不存在' });
            }
            // 从MinIO删除二维码图片 - 这里我们假设qrCodeUrl包含了足够的信息来构建objectName
            // 注意：实际实现可能需要从数据库中查询文件记录以获取完整的objectName
            // 由于我们的架构设计中，文件记录应该存储在modelFiles集合中，所以需要查询该集合
            const db = (0, mongodb_1.getDB)();
            if (db) {
                // 查询二维码文件记录
                const fileRecord = await db.collection('modelFiles').findOne({
                    $or: [
                        { originalFilename: path_1.default.basename(embeddedPart.qrCodeUrl) },
                        { url: embeddedPart.qrCodeUrl }
                    ]
                });
                if (fileRecord) {
                    // 从MinIO删除文件
                    await (0, fileUploadService_1.deleteFileFromMinIO)(fileRecord.bucketName, fileRecord.objectName);
                    // 删除文件记录
                    await db.collection('modelFiles').deleteOne({ _id: fileRecord._id });
                }
            }
            await EmbeddedPart_1.default.delete(id);
            return res.status(200).json({ message: '预埋件删除成功' });
        }
        catch (error) {
            console.error('删除预埋件失败:', error);
            return res.status(500).json({ message: '删除预埋件失败', error: String(error) });
        }
    }
    // 按项目获取预埋件
    static async getEmbeddedPartsByProject(req, res) {
        try {
            const { projectId } = req.params;
            const embeddedParts = await EmbeddedPart_1.default.findByProjectId(projectId);
            return res.status(200).json(embeddedParts);
        }
        catch (error) {
            console.error('按项目获取预埋件失败:', error);
            return res.status(500).json({ message: '按项目获取预埋件失败', error: String(error) });
        }
    }
    // 按楼层获取预埋件
    static async getEmbeddedPartsByFloor(req, res) {
        try {
            const { projectId, floorId } = req.params;
            const embeddedParts = await EmbeddedPart_1.default.findAll({
                projectId,
                location: { $regex: floorId, $options: 'i' }
            });
            return res.status(200).json(embeddedParts);
        }
        catch (error) {
            console.error('按楼层获取预埋件失败:', error);
            return res.status(500).json({ message: '按楼层获取预埋件失败', error: String(error) });
        }
    }
    // 获取二维码
    static async generateQRCode(req, res) {
        try {
            const { id } = req.params;
            const embeddedPart = await EmbeddedPart_1.default.findById(id);
            if (!embeddedPart || !embeddedPart.qrCodeUrl) {
                return res.status(404).json({ message: '预埋件或二维码不存在' });
            }
            // 从MinIO获取二维码图片
            const db = (0, mongodb_1.getDB)();
            if (!db) {
                return res.status(500).json({ message: '数据库连接失败' });
            }
            // 查询二维码文件记录
            const fileRecord = await db.collection('modelFiles').findOne({
                $or: [
                    { originalFilename: path_1.default.basename(embeddedPart.qrCodeUrl) },
                    { url: embeddedPart.qrCodeUrl }
                ]
            });
            if (!fileRecord) {
                return res.status(404).json({ message: '二维码文件记录不存在' });
            }
            // 从MinIO下载文件
            const fileBuffer = await (0, fileUploadService_1.downloadFileFromMinIO)(fileRecord.bucketName, fileRecord.objectName);
            // 设置响应头并返回文件
            res.setHeader('Content-Type', 'image/png'); // 假设二维码是PNG格式
            res.setHeader('Content-Length', fileBuffer.length);
            return res.send(fileBuffer);
        }
        catch (error) {
            console.error('获取二维码失败:', error);
            return res.status(500).json({ message: '获取二维码失败', error: String(error) });
        }
    }
    // 确认安装
    static async confirmInstallation(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: '未授权' });
            }
            const embeddedPart = await EmbeddedPart_1.default.findById(id);
            if (!embeddedPart) {
                return res.status(404).json({ message: '预埋件不存在' });
            }
            const updateData = {
                status: 'installed',
                installationDate: new Date()
            };
            const updatedPart = await EmbeddedPart_1.default.update(id, updateData);
            return res.status(200).json({ message: '安装确认成功', data: updatedPart });
        }
        catch (error) {
            console.error('确认安装失败:', error);
            return res.status(500).json({ message: '确认安装失败', error: String(error) });
        }
    }
    // 确认验收
    static async confirmInspection(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: '未授权' });
            }
            const embeddedPart = await EmbeddedPart_1.default.findById(id);
            if (!embeddedPart) {
                return res.status(404).json({ message: '预埋件不存在' });
            }
            const updateData = {
                status: status,
                inspectorId: userId,
                inspectionDate: new Date(),
                notes
            };
            const updatedPart = await EmbeddedPart_1.default.update(id, updateData);
            return res.status(200).json({ message: '验收确认成功', data: updatedPart });
        }
        catch (error) {
            console.error('确认验收失败:', error);
            return res.status(500).json({ message: '确认验收失败', error: String(error) });
        }
    }
    // 获取状态统计
    static async getStatusStats(req, res) {
        try {
            const { projectId } = req.params;
            const db = (0, mongodb_1.getDB)();
            if (!db) {
                return res.status(500).json({ message: '数据库连接失败' });
            }
            const stats = await db.collection('embedded_parts').aggregate([
                { $match: { projectId } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $project: { status: '$_id', count: 1, _id: 0 } }
            ]).toArray();
            // 转换为更友好的格式
            const formattedStats = stats.reduce((acc, item) => {
                acc[item.status] = item.count;
                return acc;
            }, {});
            return res.status(200).json({ stats: formattedStats });
        }
        catch (error) {
            console.error('获取状态统计失败:', error);
            return res.status(500).json({ message: '获取状态统计失败', error: String(error) });
        }
    }
}
exports.default = EmbeddedPartController;
