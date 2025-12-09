"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Project_1 = __importDefault(require("../models/Project"));
const EmbeddedPart_1 = __importDefault(require("../models/EmbeddedPart"));
const docx_1 = require("docx");
const XLSX = __importStar(require("xlsx"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
class ReportController {
    // 生成项目进度报告
    static async generateProjectProgressReport(req, res) {
        try {
            // 支持GET查询参数和POST请求体
            let projectId;
            let startDate;
            let endDate;
            if (req.method === 'POST') {
                // 从POST请求体获取数据
                const { dateRange } = req.body;
                projectId = req.params.projectId;
                if (dateRange && Array.isArray(dateRange)) {
                    startDate = dateRange[0];
                    endDate = dateRange[1];
                }
            }
            else {
                // 从GET查询参数获取数据
                projectId = req.query.projectId;
                startDate = req.query.startDate;
                endDate = req.query.endDate;
            }
            const query = {};
            if (projectId)
                query.projectId = projectId;
            if (startDate && endDate) {
                query.createdAt = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
            const projects = await Project_1.default.findAll(query);
            const embeddedParts = await EmbeddedPart_1.default.findAll(query);
            // 生成报告数据
            const reportData = {
                title: '项目进度报告',
                generatedAt: new Date().toLocaleString('zh-CN'),
                projectStats: {
                    totalProjects: projects.length,
                    activeProjects: projects.filter(p => p.status === 'under_construction').length,
                    completedProjects: projects.filter(p => p.status === 'completed').length
                },
                embeddedPartStats: {
                    totalParts: embeddedParts.length,
                    pendingParts: embeddedParts.filter(p => p.status === 'pending').length,
                    installedParts: embeddedParts.filter(p => p.status === 'installed').length,
                    inspectedParts: embeddedParts.filter(p => p.status === 'inspected').length
                },
                projects: projects.map(project => {
                    const projectParts = embeddedParts.filter(p => p.projectId === project.id);
                    return {
                        ...project,
                        totalEmbeddedParts: projectParts.length,
                        installedCount: projectParts.filter(p => p.status === 'installed').length,
                        inspectedCount: projectParts.filter(p => p.status === 'inspected').length,
                        completionRate: projectParts.length > 0
                            ? Math.round(((projectParts.filter(p => p.status === 'installed').length + projectParts.filter(p => p.status === 'inspected').length) / (projectParts.length * 2)) * 100)
                            : 0
                    };
                })
            };
            return res.status(200).json(reportData);
        }
        catch (error) {
            console.error('生成项目进度报告失败:', error);
            return res.status(500).json({ message: '生成项目进度报告失败', error: String(error) });
        }
    }
    // 生成预埋件状态报告
    static async generateEmbeddedPartStatusReport(req, res) {
        try {
            // 支持GET查询参数和POST请求体
            let projectId;
            let floorId;
            let status;
            if (req.method === 'POST') {
                // 从POST请求体获取数据
                const { projectId: bodyProjectId, status: bodyStatus } = req.body;
                projectId = bodyProjectId;
                status = bodyStatus;
            }
            else {
                // 从GET查询参数获取数据
                projectId = req.query.projectId;
                floorId = req.query.floorId;
            }
            const query = {};
            if (projectId)
                query.projectId = projectId;
            if (floorId)
                query.floorId = floorId;
            if (status)
                query.status = status;
            const embeddedParts = await EmbeddedPart_1.default.findAll(query);
            // 生成报告数据
            const reportData = {
                title: '预埋件状态报告',
                generatedAt: new Date().toLocaleString('zh-CN'),
                totalParts: embeddedParts.length,
                statusDistribution: {
                    pending: embeddedParts.filter(p => p.status === 'pending').length,
                    installed: embeddedParts.filter(p => p.status === 'installed').length,
                    inspected: embeddedParts.filter(p => p.status === 'inspected').length
                },
                parts: embeddedParts.map(part => ({
                    ...part
                }))
            };
            return res.status(200).json(reportData);
        }
        catch (error) {
            console.error('生成预埋件状态报告失败:', error);
            return res.status(500).json({ message: '生成预埋件状态报告失败', error: String(error) });
        }
    }
    // 生成项目报告文件（支持原有GET请求）
    static async generateProjectReportFile(req, res) {
        try {
            const { projectId, format } = req.query;
            if (!projectId) {
                return res.status(400).json({ message: '项目ID不能为空' });
            }
            if (!['pdf', 'excel', 'word'].includes(format)) {
                return res.status(400).json({ message: '不支持的报告格式' });
            }
            // 获取项目数据
            const project = await Project_1.default.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: '项目不存在' });
            }
            // 获取预埋件数据
            const embeddedParts = await EmbeddedPart_1.default.findAll({ projectId: projectId });
            // 根据格式生成报告文件
            if (format === 'excel') {
                return this.generateExcelReport(project, embeddedParts, res);
            }
            else if (format === 'word') {
                return this.generateWordReport(project, embeddedParts, res);
            }
            else if (format === 'pdf') {
                return this.generatePdfReport(project, embeddedParts, res);
            }
            return res.status(400).json({ message: '不支持的报告格式' });
        }
        catch (error) {
            console.error('生成项目报告文件失败:', error);
            return res.status(500).json({ message: '生成项目报告文件失败', error: String(error) });
        }
    }
    // 生成Excel报告
    static async generateExcelReport(project, embeddedParts, res) {
        try {
            // 创建工作簿
            const workbook = XLSX.utils.book_new();
            // 项目信息工作表
            const projectInfo = [
                ['项目名称', project.name],
                ['项目编号', project.code],
                ['项目状态', project.status === 'under_construction' ? '进行中' : project.status === 'completed' ? '已完成' : '待开始'],
                ['项目描述', project.description || '无'],
                ['创建时间', new Date(project.createdAt).toLocaleString('zh-CN')],
                ['更新时间', new Date(project.updatedAt).toLocaleString('zh-CN')]
            ];
            const projectSheet = XLSX.utils.aoa_to_sheet(projectInfo);
            XLSX.utils.book_append_sheet(workbook, projectSheet, '项目信息');
            // 预埋件状态统计表
            const statsInfo = [
                ['状态', '数量'],
                ['总数', embeddedParts.length],
                ['待安装', embeddedParts.filter(p => p.status === 'pending').length],
                ['已安装', embeddedParts.filter(p => p.status === 'installed').length],
                ['已验收', embeddedParts.filter(p => p.status === 'inspected').length]
            ];
            const statsSheet = XLSX.utils.aoa_to_sheet(statsInfo);
            XLSX.utils.book_append_sheet(workbook, statsSheet, '状态统计');
            // 预埋件详细列表
            const partsData = embeddedParts.map(part => ({
                '预埋件ID': part.id,
                '项目ID': part.projectId,
                '楼层ID': part.floorId,
                '标识符': part.identifier,
                '类型': part.type,
                '状态': part.status === 'pending' ? '待安装' : part.status === 'installed' ? '已安装' : part.status === 'inspected' ? '已验收' : '未知',
                'X坐标': part.coordinates.x,
                'Y坐标': part.coordinates.y,
                'Z坐标': part.coordinates.z,
                '创建时间': new Date(part.createdAt).toLocaleString('zh-CN'),
                '更新时间': new Date(part.updatedAt).toLocaleString('zh-CN')
            }));
            const partsSheet = XLSX.utils.json_to_sheet(partsData);
            XLSX.utils.book_append_sheet(workbook, partsSheet, '预埋件列表');
            // 生成Excel文件
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
            res.setHeader('Content-Disposition', `attachment; filename=${project.name}_项目报告.xlsx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(excelBuffer);
        }
        catch (error) {
            console.error('生成Excel报告失败:', error);
            return res.status(500).json({ message: '生成Excel报告失败', error: String(error) });
        }
    }
    // 生成Word报告
    static async generateWordReport(project, embeddedParts, res) {
        try {
            // 创建Word文档
            const doc = new docx_1.Document({
                sections: [
                    {
                        properties: {},
                        children: [
                            new docx_1.Paragraph({
                                text: `${project.name} 项目报告`,
                                heading: docx_1.HeadingLevel.HEADING_1,
                                alignment: docx_1.AlignmentType.CENTER
                            }),
                            new docx_1.Paragraph({
                                children: [
                                    new docx_1.TextRun('生成时间：'),
                                    new docx_1.TextRun(new Date().toLocaleString('zh-CN'))
                                ],
                                alignment: docx_1.AlignmentType.CENTER
                            }),
                            new docx_1.Paragraph(''),
                            new docx_1.Paragraph({
                                text: '项目信息',
                                heading: docx_1.HeadingLevel.HEADING_2
                            }),
                            new docx_1.Table({
                                width: {
                                    size: 100,
                                    type: docx_1.WidthType.PERCENTAGE,
                                },
                                rows: [
                                    new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('项目名称')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(project.name)],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    }),
                                    new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('项目编号')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(project.code)],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    }),
                                    new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('项目状态')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(project.status === 'active' ? '进行中' : project.status === 'completed' ? '已完成' : '待开始')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            new docx_1.Paragraph(''),
                            new docx_1.Paragraph({
                                text: '预埋件状态统计',
                                heading: docx_1.HeadingLevel.HEADING_2
                            }),
                            new docx_1.Table({
                                width: {
                                    size: 100,
                                    type: docx_1.WidthType.PERCENTAGE,
                                },
                                rows: [
                                    new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('状态')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('数量')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('占比')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    }),
                                    new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('总数')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(embeddedParts.length.toString())],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('100%')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    }),
                                    new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('待安装')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(embeddedParts.filter(p => p.status === 'pending').length.toString())],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(embeddedParts.length > 0 ? `${((embeddedParts.filter(p => p.status === 'pending').length / embeddedParts.length) * 100).toFixed(2)}%` : '0%')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    }),
                                    new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('已安装')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(embeddedParts.filter(p => p.status === 'installed').length.toString())],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(embeddedParts.length > 0 ? `${((embeddedParts.filter(p => p.status === 'installed').length / embeddedParts.length) * 100).toFixed(2)}%` : '0%')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    }),
                                    new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('已验收')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(embeddedParts.filter(p => p.status === 'inspected').length.toString())],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(embeddedParts.length > 0 ? `${((embeddedParts.filter(p => p.status === 'inspected').length / embeddedParts.length) * 100).toFixed(2)}%` : '0%')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            new docx_1.Paragraph(''),
                            new docx_1.Paragraph({
                                text: '预埋件详细列表',
                                heading: docx_1.HeadingLevel.HEADING_2
                            }),
                            new docx_1.Table({
                                width: {
                                    size: 100,
                                    type: docx_1.WidthType.PERCENTAGE,
                                },
                                rows: [
                                    new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('ID')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('标识符')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('类型')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph('状态')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    }),
                                    ...embeddedParts.map(part => new docx_1.TableRow({
                                        children: [
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(part.id)],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(part.identifier)],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(part.type)],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                            new docx_1.TableCell({
                                                children: [new docx_1.Paragraph(part.status === 'pending' ? '待安装' : part.status === 'installed' ? '已安装' : part.status === 'inspected' ? '已验收' : '未知')],
                                                borders: {
                                                    top: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    left: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    right: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                    bottom: { style: docx_1.BorderStyle.SINGLE, size: 1 },
                                                },
                                            }),
                                        ],
                                    })),
                                ],
                            }),
                        ],
                    },
                ],
            });
            // 生成Word文档
            const buffer = await docx_1.Packer.toBuffer(doc);
            res.setHeader('Content-Disposition', `attachment; filename=${project.name}_项目报告.docx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            return res.send(buffer);
        }
        catch (error) {
            console.error('生成Word报告失败:', error);
            return res.status(500).json({ message: '生成Word报告失败', error: String(error) });
        }
    }
    // 生成PDF报告
    static async generatePdfReport(project, embeddedParts, res) {
        try {
            // 创建HTML内容
            const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${project.name} 项目报告</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1 {
              text-align: center;
              color: #333;
            }
            h2 {
              color: #444;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .info-section {
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <h1>${project.name} 项目报告</h1>
          <div class="info-section">
            <p><strong>生成时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
          </div>
          
          <h2>项目信息</h2>
          <table>
            <tr>
              <th>项目名称</th>
              <td>${project.name}</td>
            </tr>
            <tr>
              <th>项目编号</th>
              <td>${project.code}</td>
            </tr>
            <tr>
              <th>项目状态</th>
              <td>${project.status === 'under_construction' ? '进行中' : project.status === 'completed' ? '已完成' : '待开始'}</td>
            </tr>
          </table>
          
          <h2>预埋件状态统计</h2>
          <table>
            <tr>
              <th>状态</th>
              <th>数量</th>
              <th>占比</th>
            </tr>
            <tr>
              <td>总数</td>
              <td>${embeddedParts.length}</td>
              <td>100%</td>
            </tr>
            <tr>
              <td>待安装</td>
              <td>${embeddedParts.filter(p => p.status === 'pending').length}</td>
              <td>${embeddedParts.length > 0 ? `${((embeddedParts.filter(p => p.status === 'pending').length / embeddedParts.length) * 100).toFixed(2)}%` : '0%'}</td>
            </tr>
            <tr>
              <td>已安装</td>
              <td>${embeddedParts.filter(p => p.status === 'installed').length}</td>
              <td>${embeddedParts.length > 0 ? `${((embeddedParts.filter(p => p.status === 'installed').length / embeddedParts.length) * 100).toFixed(2)}%` : '0%'}</td>
            </tr>
            <tr>
              <td>已验收</td>
              <td>${embeddedParts.filter(p => p.status === 'inspected').length}</td>
              <td>${embeddedParts.length > 0 ? `${((embeddedParts.filter(p => p.status === 'inspected').length / embeddedParts.length) * 100).toFixed(2)}%` : '0%'}</td>
            </tr>
          </table>
          
          <h2>预埋件详细列表</h2>
          <table>
            <tr>
              <th>ID</th>
              <th>标识符</th>
              <th>类型</th>
              <th>状态</th>
            </tr>
            ${embeddedParts.map(part => `
              <tr>
                <td>${part.id}</td>
                <td>${part.identifier}</td>
                <td>${part.type}</td>
                <td>${part.status === 'pending' ? '待安装' : part.status === 'installed' ? '已安装' : part.status === 'inspected' ? '已验收' : '未知'}</td>
              </tr>
            `).join('')}
          </table>
        </body>
        </html>
      `;
            // 启动Puppeteer浏览器
            const browser = await puppeteer_core_1.default.launch();
            const page = await browser.newPage();
            // 设置页面内容
            await page.setContent(htmlContent);
            // 生成PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });
            // 关闭浏览器
            await browser.close();
            res.setHeader('Content-Disposition', `attachment; filename=${project.name}_项目报告.pdf`);
            res.setHeader('Content-Type', 'application/pdf');
            return res.send(pdfBuffer);
        }
        catch (error) {
            console.error('生成PDF报告失败:', error);
            return res.status(500).json({ message: '生成PDF报告失败', error: String(error) });
        }
    }
    // 生成报告文件（处理前端generateReportFile调用）
    static async generateReportFile(req, res) {
        try {
            const { reportData, format } = req.body;
            if (!reportData) {
                return res.status(400).json({ message: '报告数据不能为空' });
            }
            if (!['pdf', 'excel', 'word'].includes(format)) {
                return res.status(400).json({ message: '不支持的报告格式' });
            }
            // 根据报告数据类型生成相应的报告
            if (reportData.title === '项目进度报告') {
                // 为了保持兼容性，我们需要获取项目和预埋件的实际数据
                const query = {};
                if (reportData.projects && reportData.projects.length > 0) {
                    query.projectId = reportData.projects[0].id;
                }
                const project = reportData.projects && reportData.projects.length > 0 ? reportData.projects[0] : null;
                const embeddedParts = await EmbeddedPart_1.default.findAll(query);
                if (project) {
                    if (format === 'excel') {
                        return this.generateExcelReport(project, embeddedParts, res);
                    }
                    else if (format === 'word') {
                        return this.generateWordReport(project, embeddedParts, res);
                    }
                    else if (format === 'pdf') {
                        return this.generatePdfReport(project, embeddedParts, res);
                    }
                }
                else {
                    return res.status(404).json({ message: '未找到项目数据' });
                }
            }
            else if (reportData.title === '预埋件状态报告') {
                // 处理预埋件状态报告
                const query = {};
                if (reportData.parts && reportData.parts.length > 0) {
                    query.projectId = reportData.parts[0].projectId;
                }
                // 获取第一个项目作为报告主体
                const project = await Project_1.default.findById(query.projectId);
                const embeddedParts = reportData.parts || [];
                if (project) {
                    if (format === 'excel') {
                        return this.generateExcelReport(project, embeddedParts, res);
                    }
                    else if (format === 'word') {
                        return this.generateWordReport(project, embeddedParts, res);
                    }
                    else if (format === 'pdf') {
                        return this.generatePdfReport(project, embeddedParts, res);
                    }
                }
                else {
                    return res.status(404).json({ message: '未找到项目数据' });
                }
            }
            return res.status(400).json({ message: '不支持的报告类型' });
        }
        catch (error) {
            console.error('生成报告文件失败:', error);
            return res.status(500).json({ message: '生成报告文件失败', error: String(error) });
        }
    }
}
exports.default = ReportController;
