import { Router } from 'express';
import ProjectController from '../controllers/ProjectController';
import authenticate, { authorize } from '../middleware/auth';

const router = Router();

// 项目管理路由
router.get('/', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), ProjectController.getAllProjects);
router.get('/:id', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ProjectController.getProjectById);
router.post('/', authenticate, authorize('projectManager', 'admin'), ProjectController.createProject);
router.put('/:id', authenticate, authorize('projectManager', 'admin'), ProjectController.updateProject);
router.delete('/:id', authenticate, authorize('projectManager', 'admin'), ProjectController.deleteProject);

// 楼层管理路由
router.get('/:projectId/floors', authenticate, authorize('projectManager', 'admin', 'projectEngineer'), ProjectController.getFloors);
router.get('/:projectId/floors/:floorId', authenticate, authorize('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ProjectController.getFloorById);
router.post('/:projectId/floors', authenticate, authorize('projectManager', 'admin'), ProjectController.createFloor);
router.put('/:projectId/floors/:floorId', authenticate, authorize('projectManager', 'admin'), ProjectController.updateFloor);
router.delete('/:projectId/floors/:floorId', authenticate, authorize('projectManager', 'admin'), ProjectController.deleteFloor);

export default router;
