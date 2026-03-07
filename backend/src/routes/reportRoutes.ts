import { Router } from 'express';
import ReportController from '../controllers/ReportController';
import authenticate, { authorize } from '../middleware/auth';

const router = Router();

// 报告生成路由 - 适配前端API调用
router.post('/project-progress/:projectId', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ReportController.generateProjectProgressReport);
router.post('/embedded-parts-status', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ReportController.generateEmbeddedPartStatusReport);
router.post('/generate-file', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ReportController.generateReportFile);

// 保留原有GET路由以支持向后兼容
router.get('/project-progress', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ReportController.generateProjectProgressReport);
router.get('/embedded-part-status', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ReportController.generateEmbeddedPartStatusReport);
router.get('/project-report', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ReportController.generateProjectReportFile);
router.get('/download', authenticate, ReportController.generateProjectReportFile);

export default router;