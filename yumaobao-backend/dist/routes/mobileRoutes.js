"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EmbeddedPartController_1 = __importDefault(require("../controllers/EmbeddedPartController"));
const auth_1 = __importDefault(require("../middleware/auth"));
const EmbeddedPart_1 = __importDefault(require("../models/EmbeddedPart"));
const Project_1 = __importDefault(require("../models/Project"));
const router = (0, express_1.Router)();
// 移动端路由 - 简化的API接口，方便移动端应用调用
// 二维码扫描
router.post('/scan-qrcode', auth_1.default, async (req, res) => {
    try {
        const { qrCodeData } = req.body;
        const embeddedPart = await EmbeddedPart_1.default.findAll({ qrCodeData });
        if (!embeddedPart || embeddedPart.length === 0) {
            return res.status(404).json({ message: '未找到对应的预埋件' });
        }
        return res.status(200).json({ message: '扫码成功', data: embeddedPart[0] });
    }
    catch (error) {
        console.error('扫码失败:', error);
        return res.status(500).json({ message: '扫码失败', error: String(error) });
    }
});
// 安装确认
router.post('/embedded-parts/:id/install', auth_1.default, EmbeddedPartController_1.default.confirmInstallation);
// 验收确认
router.post('/embedded-parts/:id/inspect', auth_1.default, EmbeddedPartController_1.default.confirmInspection);
// 获取项目列表（移动端显示）
router.get('/projects', auth_1.default, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: '未认证' });
        }
        const { role } = req.user;
        const whereClause = role === 'admin' ? {} : { createdBy: req.user.userId };
        const projects = await Project_1.default.findAll(whereClause);
        return res.status(200).json(projects);
    }
    catch (error) {
        console.error('获取项目列表失败:', error);
        return res.status(500).json({ message: '获取项目列表失败', error: String(error) });
    }
});
// 获取项目的预埋件列表
router.get('/projects/:projectId/embedded-parts', auth_1.default, async (req, res) => {
    try {
        const { projectId } = req.params;
        const embeddedParts = await EmbeddedPart_1.default.findByProjectId(projectId);
        return res.status(200).json(embeddedParts);
    }
    catch (error) {
        console.error('获取预埋件列表失败:', error);
        return res.status(500).json({ message: '获取预埋件列表失败', error: String(error) });
    }
});
// 获取个人待处理任务
router.get('/tasks', auth_1.default, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: '未认证' });
        }
        const { role } = req.user;
        let whereClause = { status: 'pending' };
        // 根据角色筛选任务
        if (role === 'installer') {
            // 安装工：待安装的预埋件
            whereClause = { ...whereClause, status: 'pending' };
        }
        else if (role === 'qualityInspector') {
            // 质检员：已安装待验收的预埋件
            whereClause = { ...whereClause, status: 'installed' };
        }
        const embeddedParts = await EmbeddedPart_1.default.findAll(whereClause);
        return res.status(200).json(embeddedParts);
    }
    catch (error) {
        console.error('获取待处理任务失败:', error);
        return res.status(500).json({ message: '获取待处理任务失败', error: String(error) });
    }
});
exports.default = router;
