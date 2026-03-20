import { Router } from 'express';
import TechnicalManualController from '../controllers/TechnicalManualController';
import authenticate from '../middleware/auth';

const router = Router();

// 技术手册/信息中心路由
router.get('/', authenticate, TechnicalManualController.getAllManuals);
router.get('/search', authenticate, TechnicalManualController.searchManuals);
router.get('/category/:category', authenticate, TechnicalManualController.getManualsByCategory);
router.get('/:id', authenticate, TechnicalManualController.getManualById);
router.post('/seed', authenticate, TechnicalManualController.seedManuals);

export default router;
