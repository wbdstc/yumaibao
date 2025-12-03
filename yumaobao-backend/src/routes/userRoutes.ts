import { Router } from 'express';
import UserController from '../controllers/UserController';
import authenticate, { authorize } from '../middleware/auth';

const router = Router();

// 公开路由
router.post('/register', UserController.register);
router.post('/login', UserController.login);

// 需要认证的路由
router.get('/me', authenticate, UserController.getCurrentUser);

// 需要管理员权限的路由
router.get('/', authenticate, authorize('admin'), UserController.getAllUsers);
router.get('/:id', authenticate, authorize('admin'), UserController.getUserById);
router.put('/:id', authenticate, authorize('admin'), UserController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), UserController.deleteUser);

// 个人信息管理路由
router.put('/me', authenticate, UserController.updateProfile);
router.delete('/me', authenticate, UserController.deleteProfile);

export default router;
