import { Request, Response } from 'express';
import Project from '../models/Project';
import EmbeddedPart from '../models/EmbeddedPart';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer-core';

// 扩展Express Request接口以包含user属性
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
      role: string;
      [key: string]: any;
    };
  }
}

class ReportController {
  // 生成项目进度报告
  static async generateProjectProgressReport(req: Request, res: Response) {
    try {
        // 支持GET查询参数和POST请求体
        let projectId: string | undefined;
        let startDate: string | undefined;
        let endDate: string | undefined;
        
        if (req.method === 'POST') {
          // 从POST请求体获取数据
          const { dateRange } = req.body;
          projectId = req.params.projectId;
          if (dateRange && Array.isArray(dateRange)) {
            startDate = dateRange[0];
            endDate = dateRange[1];
          }
        } else {
          // 从GET查询参数获取数据
          projectId = req.query.projectId as string;
          startDate = req.query.startDate as string;
          endDate = req.query.endDate as string;
        }
      
      const query: any = {};
      
      if (projectId) query.projectId = projectId;
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const projects = await Project.findAll(query);
      const embeddedParts = await EmbeddedPart.findAll(query);

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
    } catch (error) {
      console.error('生成项目进度报告失败:', error);
      return res.status(500).json({ message: '生成项目进度报告失败', error: String(error) });
    }
  }

  // 生成预埋件状态报告
  static async generateEmbeddedPartStatusReport(req: Request, res: Response) {
    try {
      // 支持GET查询参数和POST请求体
      let projectId: string | undefined;
      let floorId: string | undefined;
      let status: string | undefined;
      
      if (req.method === 'POST') {
        // 从POST请求体获取数据
        const { projectId: bodyProjectId, status: bodyStatus } = req.body;
        projectId = bodyProjectId;
        status = bodyStatus;
      } else {
        // 从GET查询参数获取数据
        projectId = req.query.projectId as string;
        floorId = req.query.floorId as string;
      }
      
      const query: any = {};
      
      if (projectId) query.projectId = projectId;
      if (floorId) query.floorId = floorId;
      if (status) query.status = status;

      const embeddedParts = await EmbeddedPart.findAll(query);

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
    } catch (error) {
      console.error('生成预埋件状态报告失败:', error);
      return res.status(500).json({ message: '生成预埋件状态报告失败', error: String(error) });
    }
  }

  // 生成项目报告文件（支持原有GET请求）
  static async generateProjectReportFile(req: Request, res: Response) {
    try {
      const { projectId, format } = req.query;
      
      if (!projectId) {
        return res.status(400).json({ message: '项目ID不能为空' });
      }
      
      if (!['pdf', 'excel', 'word'].includes(format as string)) {
        return res.status(400).json({ message: '不支持的报告格式' });
      }

      // 获取项目数据
      const project = await Project.findById(projectId as string);
      if (!project) {
        return res.status(404).json({ message: '项目不存在' });
      }

      // 获取预埋件数据
      const embeddedParts = await EmbeddedPart.findAll({ projectId: projectId as string });
      
      // 根据格式生成报告文件
      if (format === 'excel') {
        return this.generateExcelReport(project, embeddedParts, res);
      } else if (format === 'word') {
        return this.generateWordReport(project, embeddedParts, res);
      } else if (format === 'pdf') {
        return this.generatePdfReport(project, embeddedParts, res);
      }
      return res.status(400).json({ message: '不支持的报告格式' });
    } catch (error) {
      console.error('生成项目报告文件失败:', error);
      return res.status(500).json({ message: '生成项目报告文件失败', error: String(error) });
    }
  }

  // 生成Excel报告
  private static async generateExcelReport(project: any, embeddedParts: any[], res: Response) {
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
      
      const excelFilename = `${project.name}_项目报告.xlsx`;
      const encodedExcelFilename = encodeURIComponent(excelFilename);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedExcelFilename}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(excelBuffer);
    } catch (error) {
      console.error('生成Excel报告失败:', error);
      return res.status(500).json({ message: '生成Excel报告失败', error: String(error) });
    }
  }

  // 生成Word报告
  private static async generateWordReport(project: any, embeddedParts: any[], res: Response) {
    try {
      // 创建Word文档
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: `${project.name} 项目报告`,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER
              }),
              new Paragraph({
                children: [
                  new TextRun('生成时间：'),
                  new TextRun(new Date().toLocaleString('zh-CN'))
                ],
                alignment: AlignmentType.CENTER
              }),
              new Paragraph(''),
              new Paragraph({
                text: '项目信息',
                heading: HeadingLevel.HEADING_2
              }),
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('项目名称')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(project.name)],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('项目编号')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(project.code)],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('项目状态')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(project.status === 'active' ? '进行中' : project.status === 'completed' ? '已完成' : '待开始')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph(''),
              new Paragraph({
                text: '预埋件状态统计',
                heading: HeadingLevel.HEADING_2
              }),
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('状态')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph('数量')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph('占比')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('总数')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(embeddedParts.length.toString())],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph('100%')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('待安装')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(embeddedParts.filter(p => p.status === 'pending').length.toString())],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(embeddedParts.length > 0 ? `${((embeddedParts.filter(p => p.status === 'pending').length / embeddedParts.length) * 100).toFixed(2)}%` : '0%')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('已安装')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(embeddedParts.filter(p => p.status === 'installed').length.toString())],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(embeddedParts.length > 0 ? `${((embeddedParts.filter(p => p.status === 'installed').length / embeddedParts.length) * 100).toFixed(2)}%` : '0%')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('已验收')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(embeddedParts.filter(p => p.status === 'inspected').length.toString())],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(embeddedParts.length > 0 ? `${((embeddedParts.filter(p => p.status === 'inspected').length / embeddedParts.length) * 100).toFixed(2)}%` : '0%')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph(''),
              new Paragraph({
                text: '预埋件详细列表',
                heading: HeadingLevel.HEADING_2
              }),
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('ID')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph('标识符')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph('类型')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph('状态')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                    ],
                  }),
                  ...embeddedParts.map(part => new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph(part.id)],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(part.identifier)],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(part.type)],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
                        },
                      }),
                      new TableCell({
                        children: [new Paragraph(part.status === 'pending' ? '待安装' : part.status === 'installed' ? '已安装' : part.status === 'inspected' ? '已验收' : '未知')],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1 },
                          left: { style: BorderStyle.SINGLE, size: 1 },
                          right: { style: BorderStyle.SINGLE, size: 1 },
                          bottom: { style: BorderStyle.SINGLE, size: 1 },
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
      const buffer = await Packer.toBuffer(doc);
      
      const wordFilename = `${project.name}_项目报告.docx`;
      const encodedWordFilename = encodeURIComponent(wordFilename);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedWordFilename}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      return res.send(buffer);
    } catch (error) {
      console.error('生成Word报告失败:', error);
      return res.status(500).json({ message: '生成Word报告失败', error: String(error) });
    }
  }

  // 生成PDF报告
  private static async generatePdfReport(project: any, embeddedParts: any[], res: Response) {
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
      const browser = await puppeteer.launch();
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
      
      const pdfFilename = `${project.name}_项目报告.pdf`;
      const encodedPdfFilename = encodeURIComponent(pdfFilename);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedPdfFilename}`);
      res.setHeader('Content-Type', 'application/pdf');
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('生成PDF报告失败:', error);
      return res.status(500).json({ message: '生成PDF报告失败', error: String(error) });
    }
  }

  // 生成报告文件（处理前端generateReportFile调用）
  static async generateReportFile(req: Request, res: Response) {
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
        const query: any = {};
        if (reportData.projects && reportData.projects.length > 0) {
          query.projectId = reportData.projects[0].id;
        }
        
        const project = reportData.projects && reportData.projects.length > 0 ? reportData.projects[0] : null;
        const embeddedParts = await EmbeddedPart.findAll(query);
        
        if (project) {
          if (format === 'excel') {
            return this.generateExcelReport(project, embeddedParts, res);
          } else if (format === 'word') {
            return this.generateWordReport(project, embeddedParts, res);
          } else if (format === 'pdf') {
            return this.generatePdfReport(project, embeddedParts, res);
          }
        } else {
          return res.status(404).json({ message: '未找到项目数据' });
        }
      } else if (reportData.title === '预埋件状态报告') {
        // 处理预埋件状态报告
        const query: any = {};
        if (reportData.parts && reportData.parts.length > 0) {
          query.projectId = reportData.parts[0].projectId;
        }
        
        // 获取第一个项目作为报告主体
        const project = await Project.findById(query.projectId);
        const embeddedParts = reportData.parts || [];
        
        if (project) {
          if (format === 'excel') {
            return this.generateExcelReport(project, embeddedParts, res);
          } else if (format === 'word') {
            return this.generateWordReport(project, embeddedParts, res);
          } else if (format === 'pdf') {
            return this.generatePdfReport(project, embeddedParts, res);
          }
        } else {
          return res.status(404).json({ message: '未找到项目数据' });
        }
      }
      
      return res.status(400).json({ message: '不支持的报告类型' });
    } catch (error) {
      console.error('生成报告文件失败:', error);
      return res.status(500).json({ message: '生成报告文件失败', error: String(error) });
    }
  }
}

export default ReportController;