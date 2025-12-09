import { Router } from 'express';
import ReportController from '../controllers/ReportController';
import authenticate, { authorize } from '../middleware/auth';

const router = Router();

// 报告生成路由 - 适配前端API调用
router.post('/project-progress/:projectId', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), ReportController.generateProjectProgressReport);
router.post('/embedded-parts-status', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ReportController.generateEmbeddedPartStatusReport);
router.post('/generate-file', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ReportController.generateReportFile);

// 保留原有GET路由以支持向后兼容
router.get('/project-progress', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), ReportController.generateProjectProgressReport);
router.get('/embedded-part-status', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ReportController.generateEmbeddedPartStatusReport);
router.get('/project-report', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ReportController.generateProjectReportFile);
router.get('/download', authenticate, ReportController.generateProjectReportFile);

export default router;