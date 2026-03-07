import { Router } from 'express';
import EmbeddedPartController from '../controllers/EmbeddedPartController';
import authenticate, { authorize } from '../middleware/auth';
import multer from 'multer';

const router = Router();

// 文件上传配置
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 预埋件管理路由
router.get('/', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), EmbeddedPartController.getAllEmbeddedParts);
router.get('/:id', authenticate, EmbeddedPartController.getEmbeddedPartById);
router.post('/', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), EmbeddedPartController.createEmbeddedPart);
router.put('/:id', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), EmbeddedPartController.updateEmbeddedPart);
router.delete('/:id', authenticate, authorize('projectManager', 'admin'), EmbeddedPartController.deleteEmbeddedPart);

// 批量操作
router.post('/batch', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), EmbeddedPartController.batchCreateEmbeddedParts);
router.post('/import', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), upload.single('file'), EmbeddedPartController.importEmbeddedParts);
router.put('/batch/status', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), EmbeddedPartController.batchUpdateStatus);
router.post('/batch/delete', authenticate, authorize('projectManager', 'admin'), EmbeddedPartController.batchDeleteEmbeddedParts);

// 按项目和楼层获取预埋件
router.get('/project/:projectId', authenticate, EmbeddedPartController.getEmbeddedPartsByProject);
router.get('/project/:projectId/floor/:floorId', authenticate, EmbeddedPartController.getEmbeddedPartsByFloor);

// 二维码相关
router.get('/:id/qrcode', authenticate, EmbeddedPartController.generateQRCode);
router.put('/:id/scan-status', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), EmbeddedPartController.updateScanStatus);
router.post('/:id/install', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'installer'), upload.array('photos', 5), EmbeddedPartController.confirmInstallation);
router.post('/:id/inspect', authenticate, authorize('projectManager', 'admin', 'qualityInspector'), upload.array('photos', 5), EmbeddedPartController.confirmInspection);

// 状态统计
router.get('/project/:projectId/stats', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), EmbeddedPartController.getStatusStats);

export default router;
