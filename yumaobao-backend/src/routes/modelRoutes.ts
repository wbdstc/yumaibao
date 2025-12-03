import { Router } from 'express';
import ModelController from '../controllers/ModelController';
import authenticate, { authorize } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

// 配置文件上传存储
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/models');
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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

export default router;
