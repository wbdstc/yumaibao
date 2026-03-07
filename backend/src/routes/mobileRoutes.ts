import { Router } from 'express';
import EmbeddedPartController from '../controllers/EmbeddedPartController';
import authenticate from '../middleware/auth';
import EmbeddedPart from '../models/EmbeddedPart';
import Project from '../models/Project';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });

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

const router = Router();

// 移动端路由 - 简化的API接口，方便移动端应用调用

// 二维码扫描
router.post('/scan-qrcode', authenticate, async (req, res) => {
  try {
    const { qrCodeData } = req.body;
    const embeddedPart = await EmbeddedPart.findAll({ qrCodeData });

    if (!embeddedPart || embeddedPart.length === 0) {
      return res.status(404).json({ message: '未找到对应的预埋件' });
    }

    return res.status(200).json({ message: '扫码成功', data: embeddedPart[0] });
  } catch (error) {
    console.error('扫码失败:', error);
    return res.status(500).json({ message: '扫码失败', error: String(error) });
  }
});

// 安装确认
router.post('/embedded-parts/:id/install', authenticate, upload.array('photos', 5), EmbeddedPartController.confirmInstallation);

// 验收确认
router.post('/embedded-parts/:id/inspect', authenticate, upload.array('photos', 5), EmbeddedPartController.confirmInspection);

// 获取项目列表（移动端显示）
router.get('/projects', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未认证' });
    }
    const { role } = req.user;
    const whereClause = role === 'admin' ? {} : { createdBy: req.user.id };
    const projects = await Project.findAll(whereClause);
    return res.status(200).json(projects);
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return res.status(500).json({ message: '获取项目列表失败', error: String(error) });
  }
});

// 获取项目的预埋件列表
router.get('/projects/:projectId/embedded-parts', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const embeddedParts = await EmbeddedPart.findByProjectId(projectId);
    return res.status(200).json(embeddedParts);
  } catch (error) {
    console.error('获取预埋件列表失败:', error);
    return res.status(500).json({ message: '获取预埋件列表失败', error: String(error) });
  }
});

// 获取个人待处理任务
router.get('/tasks', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未认证' });
    }
    const { role } = req.user;
    let whereClause: any = { status: 'pending' };

    // 根据角色筛选任务
    if (role === 'installer') {
      // 安装工：待安装的预埋件
      whereClause = { ...whereClause, status: 'pending' };
    } else if (role === 'qualityInspector') {
      // 质检员：已安装待验收的预埋件
      whereClause = { ...whereClause, status: 'installed' };
    }

    const embeddedParts = await EmbeddedPart.findAll(whereClause);
    return res.status(200).json(embeddedParts);
  } catch (error) {
    console.error('获取待处理任务失败:', error);
    return res.status(500).json({ message: '获取待处理任务失败', error: String(error) });
  }
});

export default router;
