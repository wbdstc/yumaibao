import { Response } from 'express';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType
} from 'docx';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer-core';
import type { ProjectAttributes } from '../models/Project';
import type { EmbeddedPartAttributes } from '../models/EmbeddedPart';

type ReportProject = ProjectAttributes & Record<string, any>;
type ReportPart = EmbeddedPartAttributes & Record<string, any>;

export type ReportFormat = 'pdf' | 'excel' | 'word';

export interface ReportBuildFilters {
  projectId?: string;
  floorId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  generatedBy?: string;
}

export interface ReportProjectSummary {
  projectId: string;
  projectName: string;
  projectCode: string;
  projectStatus: string;
  location: string;
  totalParts: number;
  pendingParts: number;
  installedParts: number;
  inspectedParts: number;
  rejectedParts: number;
  completedParts: number;
  overdueInstall: number;
  overdueInspect: number;
  installRate: string;
  inspectionRate: string;
  completionRate: string;
}

export interface ReportFloorSummary {
  floorId: string;
  floorName: string;
  totalParts: number;
  pendingParts: number;
  installedParts: number;
  inspectedParts: number;
  rejectedParts: number;
  completedParts: number;
  completionRate: string;
}

export interface ReportRiskItem {
  level: 'high' | 'medium' | 'low';
  category: string;
  count: number;
  description: string;
}

export interface ReportActivityItem {
  timestamp: string;
  action: string;
  operator: string;
  partCode: string;
  partName: string;
  floorName: string;
  location: string;
  note: string;
}

export interface ReportDetailRow {
  partId: string;
  partCode: string;
  partName: string;
  type: string;
  modelNumber: string;
  floorName: string;
  location: string;
  status: string;
  x: string;
  y: string;
  z: string;
  createdAt: string;
  installationDate: string;
  inspectionDate: string;
  updatedAt: string;
  overdue: string;
  notes: string;
}

export interface ExportableReport {
  title: string;
  reportType: 'project-progress' | 'embedded-parts-status';
  generatedAt: string;
  generatedBy: string;
  filters: {
    projectId?: string;
    projectName?: string;
    floorId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  };
  summary: {
    totalProjects: number;
    totalParts: number;
    pendingParts: number;
    installedParts: number;
    inspectedParts: number;
    rejectedParts: number;
    completedParts: number;
    overdueInstall: number;
    overdueInspect: number;
    installRate: string;
    inspectionRate: string;
    completionRate: string;
  };
  highlights: string[];
  projectSummaries: ReportProjectSummary[];
  floorSummaries: ReportFloorSummary[];
  riskItems: ReportRiskItem[];
  recentActivities: ReportActivityItem[];
  detailRows: ReportDetailRow[];
}

const OVERDUE_MS = 24 * 60 * 60 * 1000;

const STATUS_LABELS: Record<string, string> = {
  pending: '待安装',
  installed: '已安装',
  inspected: '已验收',
  rejected: '已驳回',
  completed: '已完成'
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  planning: '规划中',
  pending: '待开始',
  active: '进行中',
  under_construction: '进行中',
  completed: '已完成'
};

const getText = (value: unknown, fallback = '-'): string => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value);
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value: unknown): string => {
  const date = toDate(value);
  return date ? date.toLocaleString('zh-CN') : '-';
};

const formatPercent = (numerator: number, denominator: number): string => {
  if (!denominator) return '0.0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
};

const normalizeEndDate = (value?: string): Date | null => {
  const date = toDate(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const parseCoordinates = (coordinates: unknown): Record<string, unknown> => {
  if (!coordinates) return {};
  if (typeof coordinates === 'string') {
    try {
      return JSON.parse(coordinates) as Record<string, unknown>;
    } catch (_error) {
      return {};
    }
  }
  return typeof coordinates === 'object' ? (coordinates as Record<string, unknown>) : {};
};

const getStatusLabel = (status?: string): string => STATUS_LABELS[status || ''] || '未知';
const getProjectStatusLabel = (status?: string): string => PROJECT_STATUS_LABELS[status || ''] || '未知';
const getPartCode = (part: ReportPart): string => getText(part.code || part.identifier || part.id);
const getFloorName = (part: ReportPart): string => getText(part.floorName || part.floorId, '未分配楼层');

const isOverdueInstall = (part: ReportPart, now: Date): boolean => {
  const createdAt = toDate(part.createdAt);
  return Boolean(part.status === 'pending' && createdAt && now.getTime() - createdAt.getTime() > OVERDUE_MS);
};

const isOverdueInspect = (part: ReportPart, now: Date): boolean => {
  const updatedAt = toDate(part.updatedAt);
  return Boolean(part.status === 'installed' && updatedAt && now.getTime() - updatedAt.getTime() > OVERDUE_MS);
};

const matchesDateRange = (part: ReportPart, startDate?: string, endDate?: string): boolean => {
  if (!startDate && !endDate) return true;

  const start = toDate(startDate);
  const end = normalizeEndDate(endDate);
  const candidates = [
    toDate(part.createdAt),
    toDate(part.updatedAt),
    toDate(part.installationDate),
    toDate(part.inspectionDate),
    ...(Array.isArray(part.statusHistory)
      ? part.statusHistory.map((item: Record<string, unknown>) => toDate(item.timestamp))
      : [])
  ].filter((item): item is Date => item instanceof Date);

  if (candidates.length === 0) return false;

  return candidates.some(item => {
    if (start && item < start) return false;
    if (end && item > end) return false;
    return true;
  });
};

const buildProjectSummary = (project: ReportProject, parts: ReportPart[], now: Date): ReportProjectSummary => {
  const totalParts = parts.length;
  const installedOrBeyond = parts.filter(part => ['installed', 'inspected', 'rejected', 'completed'].includes(part.status)).length;
  const inspectedOrBeyond = parts.filter(part => ['inspected', 'rejected', 'completed'].includes(part.status)).length;
  const completed = parts.filter(part => part.status === 'completed').length;

  return {
    projectId: getText(project.id, ''),
    projectName: getText(project.name, ''),
    projectCode: getText(project.code, '-'),
    projectStatus: getProjectStatusLabel(project.status),
    location: getText(project.location, '-'),
    totalParts,
    pendingParts: parts.filter(part => part.status === 'pending').length,
    installedParts: parts.filter(part => part.status === 'installed').length,
    inspectedParts: parts.filter(part => part.status === 'inspected').length,
    rejectedParts: parts.filter(part => part.status === 'rejected').length,
    completedParts: parts.filter(part => part.status === 'completed').length,
    overdueInstall: parts.filter(part => isOverdueInstall(part, now)).length,
    overdueInspect: parts.filter(part => isOverdueInspect(part, now)).length,
    installRate: formatPercent(installedOrBeyond, totalParts),
    inspectionRate: formatPercent(inspectedOrBeyond, totalParts),
    completionRate: formatPercent(completed, totalParts)
  };
};

const buildFloorSummaries = (parts: ReportPart[]): ReportFloorSummary[] => {
  const grouped = new Map<string, ReportPart[]>();

  parts.forEach(part => {
    const key = getText(part.floorId, 'unknown-floor');
    const current = grouped.get(key) || [];
    current.push(part);
    grouped.set(key, current);
  });

  return Array.from(grouped.entries())
    .map(([floorId, floorParts]) => ({
      floorId,
      floorName: getFloorName(floorParts[0]),
      totalParts: floorParts.length,
      pendingParts: floorParts.filter(part => part.status === 'pending').length,
      installedParts: floorParts.filter(part => part.status === 'installed').length,
      inspectedParts: floorParts.filter(part => part.status === 'inspected').length,
      rejectedParts: floorParts.filter(part => part.status === 'rejected').length,
      completedParts: floorParts.filter(part => part.status === 'completed').length,
      completionRate: formatPercent(
        floorParts.filter(part => part.status === 'completed').length,
        floorParts.length
      )
    }))
    .sort((a, b) => a.floorName.localeCompare(b.floorName, 'zh-CN'));
};

const buildRiskItems = (parts: ReportPart[], now: Date): ReportRiskItem[] => {
  const overdueInstall = parts.filter(part => isOverdueInstall(part, now)).length;
  const overdueInspect = parts.filter(part => isOverdueInspect(part, now)).length;
  const rejectedParts = parts.filter(part => part.status === 'rejected').length;
  const pendingParts = parts.filter(part => part.status === 'pending').length;
  const risks: ReportRiskItem[] = [];

  if (overdueInstall > 0) {
    risks.push({
      level: 'high',
      category: '安装超时',
      count: overdueInstall,
      description: `${overdueInstall} 个预埋件超过 24 小时仍未安装，建议优先处理。`
    });
  }

  if (overdueInspect > 0) {
    risks.push({
      level: 'high',
      category: '验收超时',
      count: overdueInspect,
      description: `${overdueInspect} 个预埋件已安装但超时未验收，需要尽快补齐质检闭环。`
    });
  }

  if (rejectedParts > 0) {
    risks.push({
      level: 'medium',
      category: '整改项',
      count: rejectedParts,
      description: `${rejectedParts} 个预埋件处于驳回状态，需要安排返工或复检。`
    });
  }

  if (parts.length > 0 && pendingParts / parts.length >= 0.3) {
    risks.push({
      level: 'medium',
      category: '待安装积压',
      count: pendingParts,
      description: `待安装占比为 ${formatPercent(pendingParts, parts.length)}，存在明显积压。`
    });
  }

  return risks;
};

const buildActivities = (parts: ReportPart[], startDate?: string, endDate?: string): ReportActivityItem[] =>
  parts
    .flatMap(part => {
      const history = Array.isArray(part.statusHistory) ? part.statusHistory : [];
      if (history.length > 0) {
        return history.map((record: Record<string, unknown>) => ({
          timestamp: formatDateTime(record.timestamp),
          action: getStatusLabel(getText(record.status, '')),
          operator: getText(record.updatedBy, '系统'),
          partCode: getPartCode(part),
          partName: getText(part.name, '-'),
          floorName: getFloorName(part),
          location: getText(part.location, '-'),
          note: getText(record.note, '-'),
          rawTimestamp: toDate(record.timestamp)
        }));
      }

      return [];
    })
    .filter((item): item is ReportActivityItem & { rawTimestamp: Date } => {
      if (!item.rawTimestamp) return false;
      const start = toDate(startDate);
      const end = normalizeEndDate(endDate);
      if (start && item.rawTimestamp < start) return false;
      if (end && item.rawTimestamp > end) return false;
      return true;
    })
    .sort((a, b) => b.rawTimestamp.getTime() - a.rawTimestamp.getTime())
    .slice(0, 30)
    .map(({ rawTimestamp: _rawTimestamp, ...item }) => item);

const buildDetailRows = (parts: ReportPart[], now: Date): ReportDetailRow[] =>
  parts.map(part => {
    const coordinates = parseCoordinates(part.coordinates);
    return {
      partId: getText(part.id, ''),
      partCode: getPartCode(part),
      partName: getText(part.name, '-'),
      type: getText(part.type, '-'),
      modelNumber: getText(part.modelNumber, '-'),
      floorName: getFloorName(part),
      location: getText(part.location, '-'),
      status: getStatusLabel(part.status),
      x: getText(coordinates.x, ''),
      y: getText(coordinates.y, ''),
      z: getText(coordinates.z, ''),
      createdAt: formatDateTime(part.createdAt),
      installationDate: formatDateTime(part.installationDate),
      inspectionDate: formatDateTime(part.inspectionDate),
      updatedAt: formatDateTime(part.updatedAt),
      overdue: isOverdueInstall(part, now) || isOverdueInspect(part, now) ? '是' : '',
      notes: getText(part.notes, '-')
    };
  });

const buildReport = (
  reportType: ExportableReport['reportType'],
  title: string,
  projects: ReportProject[],
  parts: ReportPart[],
  filters: ReportBuildFilters
): ExportableReport => {
  const now = new Date();
  const filteredParts = parts.filter(part => {
    if (filters.projectId && part.projectId !== filters.projectId) return false;
    if (filters.floorId && getText(part.floorId, '') !== filters.floorId) return false;
    if (filters.status && part.status !== filters.status) return false;
    return matchesDateRange(part, filters.startDate, filters.endDate);
  });

  const scopedProjects = filters.projectId ? projects.filter(project => project.id === filters.projectId) : projects;
  const projectSummaries = (scopedProjects.length > 0 ? scopedProjects : projects)
    .map(project => buildProjectSummary(project, filteredParts.filter(part => part.projectId === project.id), now))
    .filter(item => filters.projectId || item.totalParts > 0);

  const totalParts = filteredParts.length;
  const installedOrBeyond = filteredParts.filter(part => ['installed', 'inspected', 'rejected', 'completed'].includes(part.status)).length;
  const inspectedOrBeyond = filteredParts.filter(part => ['inspected', 'rejected', 'completed'].includes(part.status)).length;
  const completedParts = filteredParts.filter(part => part.status === 'completed').length;
  const risks = buildRiskItems(filteredParts, now);
  const projectName = scopedProjects[0]?.name || '当前范围';

  return {
    title,
    reportType,
    generatedAt: now.toLocaleString('zh-CN'),
    generatedBy: getText(filters.generatedBy, '系统'),
    filters: {
      projectId: filters.projectId,
      projectName,
      floorId: filters.floorId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      status: filters.status ? getStatusLabel(filters.status) : undefined
    },
    summary: {
      totalProjects: projectSummaries.length,
      totalParts,
      pendingParts: filteredParts.filter(part => part.status === 'pending').length,
      installedParts: filteredParts.filter(part => part.status === 'installed').length,
      inspectedParts: filteredParts.filter(part => part.status === 'inspected').length,
      rejectedParts: filteredParts.filter(part => part.status === 'rejected').length,
      completedParts,
      overdueInstall: filteredParts.filter(part => isOverdueInstall(part, now)).length,
      overdueInspect: filteredParts.filter(part => isOverdueInspect(part, now)).length,
      installRate: formatPercent(installedOrBeyond, totalParts),
      inspectionRate: formatPercent(inspectedOrBeyond, totalParts),
      completionRate: formatPercent(completedParts, totalParts)
    },
    highlights: [
      `${projectName} 当前纳入报告的预埋件共 ${totalParts} 个。`,
      `安装推进率 ${formatPercent(installedOrBeyond, totalParts)}，验收推进率 ${formatPercent(inspectedOrBeyond, totalParts)}。`,
      risks.length > 0 ? `当前识别 ${risks.length} 类重点风险，建议优先处理超时和驳回项。` : '当前未识别到明显积压风险。'
    ],
    projectSummaries,
    floorSummaries: buildFloorSummaries(filteredParts),
    riskItems: risks,
    recentActivities: buildActivities(filteredParts, filters.startDate, filters.endDate),
    detailRows: buildDetailRows(filteredParts, now)
  };
};

export const buildProjectProgressReport = (projects: ReportProject[], parts: ReportPart[], filters: ReportBuildFilters): ExportableReport =>
  buildReport('project-progress', '项目进度报告', projects, parts, filters);

export const buildEmbeddedPartStatusReport = (projects: ReportProject[], parts: ReportPart[], filters: ReportBuildFilters): ExportableReport =>
  buildReport('embedded-parts-status', '预埋件状态报告', projects, parts, filters);

const hasSelectedContent = (reportContents: string[] | undefined, targets: string[]): boolean => {
  if (!reportContents || reportContents.length === 0) return true;
  return reportContents.some(item => targets.includes(item));
};

const getReportBaseName = (report: ExportableReport): string => {
  const projectName = report.filters.projectName || report.projectSummaries[0]?.projectName || '综合';
  const reportTypeName = report.reportType === 'embedded-parts-status' ? '预埋件状态报告' : '项目进度报告';
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `${projectName}_${reportTypeName}_${stamp}`;
};

const tableCell = (text: string): TableCell => new TableCell({ children: [new Paragraph(getText(text))] });

const buildWordTable = (headers: string[], rows: string[][]): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map(header => tableCell(header)) }),
      ...rows.map(row => new TableRow({ children: row.map(cell => tableCell(cell)) }))
    ]
  });

const exportExcelReport = (report: ExportableReport, res: Response, reportContents?: string[]): Response => {
  const workbook = XLSX.utils.book_new();

  const overviewSheet = XLSX.utils.aoa_to_sheet([
    ['报告标题', report.title],
    ['导出项目', report.filters.projectName || '全部项目'],
    ['时间范围', report.filters.startDate && report.filters.endDate ? `${report.filters.startDate} 至 ${report.filters.endDate}` : '全部'],
    ['生成时间', report.generatedAt],
    ['生成人', report.generatedBy],
    ['项目数', String(report.summary.totalProjects)],
    ['预埋件总数', String(report.summary.totalParts)],
    ['安装推进率', report.summary.installRate],
    ['验收推进率', report.summary.inspectionRate],
    ['完成率', report.summary.completionRate]
  ]);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, '报告概览');

  if (report.projectSummaries.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(report.projectSummaries.map(item => ({
        项目名称: item.projectName,
        项目编号: item.projectCode,
        项目状态: item.projectStatus,
        项目位置: item.location,
        预埋件总数: item.totalParts,
        待安装: item.pendingParts,
        已安装: item.installedParts,
        已验收: item.inspectedParts,
        已驳回: item.rejectedParts,
        已完成: item.completedParts,
        安装超时: item.overdueInstall,
        验收超时: item.overdueInspect,
        安装推进率: item.installRate,
        验收推进率: item.inspectionRate,
        完成率: item.completionRate
      }))),
      '项目汇总'
    );
  }

  if (report.floorSummaries.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(report.floorSummaries.map(item => ({
        楼层名称: item.floorName,
        预埋件总数: item.totalParts,
        待安装: item.pendingParts,
        已安装: item.installedParts,
        已验收: item.inspectedParts,
        已驳回: item.rejectedParts,
        已完成: item.completedParts,
        完成率: item.completionRate
      }))),
      '楼层汇总'
    );
  }

  if (hasSelectedContent(reportContents, ['analysis', '分析总结', 'charts', '统计图表'])) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        report.riskItems.length > 0
          ? report.riskItems.map(item => ({
              风险等级: item.level,
              风险类别: item.category,
              数量: item.count,
              说明: item.description
            }))
          : [{ 风险等级: 'low', 风险类别: '无明显风险', 数量: 0, 说明: '当前范围内没有识别到明显积压风险。' }]
      ),
      '风险分析'
    );
  }

  if (report.recentActivities.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(report.recentActivities.map(item => ({
        时间: item.timestamp,
        动作: item.action,
        预埋件编号: item.partCode,
        预埋件名称: item.partName,
        楼层: item.floorName,
        位置: item.location,
        操作人: item.operator,
        备注: item.note
      }))),
      '最近动态'
    );
  }

  if (hasSelectedContent(reportContents, ['details', '详细数据']) && report.detailRows.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(report.detailRows.map(item => ({
        预埋件ID: item.partId,
        编号: item.partCode,
        名称: item.partName,
        类型: item.type,
        型号: item.modelNumber,
        楼层: item.floorName,
        位置: item.location,
        状态: item.status,
        X坐标: item.x,
        Y坐标: item.y,
        Z坐标: item.z,
        创建时间: item.createdAt,
        安装时间: item.installationDate,
        验收时间: item.inspectionDate,
        更新时间: item.updatedAt,
        是否超时: item.overdue,
        备注: item.notes
      }))),
      '明细数据'
    );
  }

  const filename = encodeURIComponent(`${getReportBaseName(report)}.xlsx`);
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buffer);
};

const exportWordReport = async (report: ExportableReport, res: Response, reportContents?: string[]): Promise<Response> => {
  const children: Array<Paragraph | Table> = [
    new Paragraph({ text: report.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: `导出项目：${report.filters.projectName || '全部项目'}`, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: `时间范围：${report.filters.startDate && report.filters.endDate ? `${report.filters.startDate} 至 ${report.filters.endDate}` : '全部'}`, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: `生成时间：${report.generatedAt}`, alignment: AlignmentType.CENTER }),
    new Paragraph('')
  ];

  children.push(new Paragraph({ text: '核心摘要', heading: HeadingLevel.HEADING_1 }));
  children.push(buildWordTable(['指标', '数值'], [
    ['项目数', String(report.summary.totalProjects)],
    ['预埋件总数', String(report.summary.totalParts)],
    ['待安装', String(report.summary.pendingParts)],
    ['已安装', String(report.summary.installedParts)],
    ['已验收', String(report.summary.inspectedParts)],
    ['已完成', String(report.summary.completedParts)],
    ['安装推进率', report.summary.installRate],
    ['验收推进率', report.summary.inspectionRate],
    ['完成率', report.summary.completionRate]
  ]));

  children.push(new Paragraph(''));
  children.push(new Paragraph({ text: '关键结论', heading: HeadingLevel.HEADING_1 }));
  report.highlights.forEach(item => children.push(new Paragraph({ text: item, bullet: { level: 0 } })));

  if (report.projectSummaries.length > 0) {
    children.push(new Paragraph(''));
    children.push(new Paragraph({ text: '项目汇总', heading: HeadingLevel.HEADING_1 }));
    children.push(buildWordTable(
      ['项目', '编号', '状态', '总数', '完成率', '安装超时', '验收超时'],
      report.projectSummaries.map(item => [
        item.projectName,
        item.projectCode,
        item.projectStatus,
        String(item.totalParts),
        item.completionRate,
        String(item.overdueInstall),
        String(item.overdueInspect)
      ])
    ));
  }

  if (report.floorSummaries.length > 0) {
    children.push(new Paragraph(''));
    children.push(new Paragraph({ text: '楼层汇总', heading: HeadingLevel.HEADING_1 }));
    children.push(buildWordTable(
      ['楼层', '总数', '待安装', '已安装', '已验收', '已完成', '完成率'],
      report.floorSummaries.map(item => [
        item.floorName,
        String(item.totalParts),
        String(item.pendingParts),
        String(item.installedParts),
        String(item.inspectedParts),
        String(item.completedParts),
        item.completionRate
      ])
    ));
  }

  if (hasSelectedContent(reportContents, ['analysis', '分析总结', 'charts', '统计图表'])) {
    children.push(new Paragraph(''));
    children.push(new Paragraph({ text: '风险分析', heading: HeadingLevel.HEADING_1 }));
    if (report.riskItems.length > 0) {
      children.push(buildWordTable(
        ['等级', '类别', '数量', '说明'],
        report.riskItems.map(item => [item.level, item.category, String(item.count), item.description])
      ));
    } else {
      children.push(new Paragraph('当前范围内未识别到明显积压风险。'));
    }
  }

  if (report.recentActivities.length > 0) {
    children.push(new Paragraph(''));
    children.push(new Paragraph({ text: '最近动态', heading: HeadingLevel.HEADING_1 }));
    children.push(buildWordTable(
      ['时间', '动作', '编号', '楼层', '位置', '操作人'],
      report.recentActivities.slice(0, 20).map(item => [
        item.timestamp,
        item.action,
        item.partCode,
        item.floorName,
        item.location,
        item.operator
      ])
    ));
  }

  if (hasSelectedContent(reportContents, ['details', '详细数据']) && report.detailRows.length > 0) {
    children.push(new Paragraph(''));
    children.push(new Paragraph({ text: '明细数据', heading: HeadingLevel.HEADING_1 }));
    const limit = 80;
    children.push(buildWordTable(
      ['编号', '名称', '类型', '楼层', '位置', '状态', '安装时间', '验收时间'],
      report.detailRows.slice(0, limit).map(item => [
        item.partCode,
        item.partName,
        item.type,
        item.floorName,
        item.location,
        item.status,
        item.installationDate,
        item.inspectionDate
      ])
    ));
    if (report.detailRows.length > limit) {
      children.push(new Paragraph(`明细较多，本次 Word 仅展示前 ${limit} 条，完整数据请导出 Excel。`));
    }
  }

  const buffer = await Packer.toBuffer(new Document({
    sections: [{ properties: {}, children }]
  }));
  const filename = encodeURIComponent(`${getReportBaseName(report)}.docx`);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  return res.send(buffer);
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const renderPdfTable = (headers: string[], rows: string[][]): string => `
  <table>
    <thead>
      <tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(getText(cell))}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
`;

const launchPdfBrowser = async () => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (executablePath) {
    return puppeteer.launch({ headless: true, executablePath } as any);
  }
  try {
    return await puppeteer.launch({ headless: true, channel: 'chrome' } as any);
  } catch (_error) {
    return puppeteer.launch({ headless: true } as any);
  }
};

const exportPdfReport = async (report: ExportableReport, res: Response, reportContents?: string[]): Promise<Response> => {
  const riskSection = hasSelectedContent(reportContents, ['analysis', '分析总结', 'charts', '统计图表']) && report.riskItems.length > 0
    ? `
      <section>
        <h2>风险分析</h2>
        ${renderPdfTable(['等级', '类别', '数量', '说明'], report.riskItems.map(item => [item.level, item.category, String(item.count), item.description]))}
      </section>
    `
    : '';

  const detailsSection = hasSelectedContent(reportContents, ['details', '详细数据']) && report.detailRows.length > 0
    ? `
      <section>
        <h2>明细数据</h2>
        ${renderPdfTable(
          ['编号', '名称', '类型', '楼层', '位置', '状态', '安装时间', '验收时间'],
          report.detailRows.slice(0, 60).map(item => [
            item.partCode,
            item.partName,
            item.type,
            item.floorName,
            item.location,
            item.status,
            item.installationDate,
            item.inspectionDate
          ])
        )}
      </section>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(report.title)}</title>
        <style>
          body { font-family: "Microsoft YaHei", sans-serif; margin: 24px; color: #1f2937; font-size: 12px; }
          h1 { font-size: 24px; margin: 0 0 8px; }
          h2 { font-size: 16px; margin: 24px 0 10px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
          .meta { color: #6b7280; margin-bottom: 12px; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
          .metric { border: 1px solid #dbe4f0; border-radius: 8px; padding: 12px; background: #f8fafc; }
          .metric strong { display: block; font-size: 18px; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #eff6ff; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(report.title)}</h1>
        <div class="meta">
          <div>导出项目：${escapeHtml(report.filters.projectName || '全部项目')}</div>
          <div>时间范围：${escapeHtml(report.filters.startDate && report.filters.endDate ? `${report.filters.startDate} 至 ${report.filters.endDate}` : '全部')}</div>
          <div>生成时间：${escapeHtml(report.generatedAt)}</div>
          <div>生成人：${escapeHtml(report.generatedBy)}</div>
        </div>
        <div class="metrics">
          <div class="metric"><span>预埋件总数</span><strong>${report.summary.totalParts}</strong></div>
          <div class="metric"><span>安装推进率</span><strong>${escapeHtml(report.summary.installRate)}</strong></div>
          <div class="metric"><span>验收推进率</span><strong>${escapeHtml(report.summary.inspectionRate)}</strong></div>
          <div class="metric"><span>完成率</span><strong>${escapeHtml(report.summary.completionRate)}</strong></div>
        </div>
        <section><h2>关键结论</h2><ul>${report.highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
        <section>${renderPdfTable(['项目', '编号', '状态', '总数', '完成率', '安装超时', '验收超时'], report.projectSummaries.map(item => [item.projectName, item.projectCode, item.projectStatus, String(item.totalParts), item.completionRate, String(item.overdueInstall), String(item.overdueInspect)]))}</section>
        ${report.floorSummaries.length > 0 ? `<section><h2>楼层汇总</h2>${renderPdfTable(['楼层', '总数', '待安装', '已安装', '已验收', '已完成', '完成率'], report.floorSummaries.map(item => [item.floorName, String(item.totalParts), String(item.pendingParts), String(item.installedParts), String(item.inspectedParts), String(item.completedParts), item.completionRate]))}</section>` : ''}
        ${riskSection}
        ${report.recentActivities.length > 0 ? `<section><h2>最近动态</h2>${renderPdfTable(['时间', '动作', '编号', '楼层', '位置', '操作人'], report.recentActivities.slice(0, 20).map(item => [item.timestamp, item.action, item.partCode, item.floorName, item.location, item.operator]))}</section>` : ''}
        ${detailsSection}
      </body>
    </html>
  `;

  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16px', right: '16px', bottom: '16px', left: '16px' } });
    const filename = encodeURIComponent(`${getReportBaseName(report)}.pdf`);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(buffer);
  } finally {
    await browser.close();
  }
};

export const exportReportFile = async (report: ExportableReport, format: ReportFormat, res: Response, reportContents?: string[]): Promise<Response> => {
  if (format === 'excel') return exportExcelReport(report, res, reportContents);
  if (format === 'word') return exportWordReport(report, res, reportContents);
  return exportPdfReport(report, res, reportContents);
};
