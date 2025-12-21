import { Router } from 'express';
import ModelController from '../controllers/ModelController';
import authenticate, { authorize } from '../middleware/auth';
import multer from 'multer';

// 配置文件上传存储 - 使用内存存储以便直接上传到MinIO
const storage = multer.memoryStorage();

const upload = multer({ storage });

const router = Router();

// 模型管理路由
router.get('/', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), ModelController.getAllModels);
router.get('/:id', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ModelController.getModelById);
router.post('/', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), upload.single('file'), ModelController.uploadModel);
router.put('/:id', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), ModelController.updateModel);
router.delete('/:id', authenticate, authorize('projectManager', 'admin'), ModelController.deleteModel);

// 按项目和楼层获取模型
router.get('/project/:projectId', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ModelController.getAllModels);
router.get('/project/:projectId/floor/:floorId', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ModelController.getAllModels);

// 文件下载
router.get('/:id/download', authenticate, ModelController.downloadModel);

// 缩略图获取
router.get('/:id/thumbnail', authenticate, ModelController.getThumbnail);

// IFC转换相关路由
router.post('/:id/convert', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), ModelController.convertIFCModel);
router.get('/ifc/status', authenticate, ModelController.checkIFCConversionStatus);

export default router;
