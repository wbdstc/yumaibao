import { Request, Response } from 'express';
import Project from '../models/Project';
import Floor from '../models/Floor';
import Model from '../models/Model';
import EmbeddedPart from '../models/EmbeddedPart';

class ProjectController {
  // 项目管理
  static async getAllProjects(req: Request, res: Response) {
    try {
      // 添加详细的调试日志
      console.log('=== 获取项目列表请求 ===');
      console.log('请求URL:', req.url);
      console.log('请求方法:', req.method);
      console.log('请求头:', req.headers);

      const user = (req as any).user;
      let projects: any[] = [];

      console.log('获取项目列表 - 用户信息:', user ? { id: user.id, role: user.role } : '未登录');

      try {
        // 简化逻辑，先尝试获取所有项目
        console.log('尝试获取所有项目');
        projects = await Project.findAll();
        console.log('获取项目列表成功 - 项目数量:', projects.length);

        return res.status(200).json(projects);
      } catch (dbError) {
        console.error('数据库查询失败:', dbError);
        console.error('数据库错误堆栈:', (dbError as Error).stack);

        // 数据库查询失败，返回空数组作为降级策略
        console.log('数据库查询失败，返回空数组');
        return res.status(200).json([]);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
      console.error('错误堆栈:', (error as Error).stack);
      return res.status(500).json({
        message: '获取项目列表失败',
        error: String(error),
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      });
    }
  }

  static async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await Project.findById(id);

      if (!project) {
        return res.status(404).json({ message: '项目不存在' });
      }

      // 获取项目关联的楼层
      const floors = await Floor.findByProjectId(id);

      // 获取每个楼层关联的模型
      for (const floor of floors) {
        const models = await Model.findByFloorId(floor.id);
        (floor as any).models = models;
      }

      return res.status(200).json({ ...project, floors });
    } catch (error) {
      console.error('获取项目详情失败:', error);
      return res.status(500).json({ message: '获取项目详情失败', error: String(error) });
    }
  }

  static async createProject(req: Request, res: Response) {
    try {
      const { name, code, description, location, startDate, endDate, status } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ message: '未授权' });
      }

      const project = await Project.create({
        name,
        code,
        description,
        location,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        createdBy: userId
      });

      return res.status(201).json({ message: '项目创建成功', data: project });
    } catch (error) {
      console.error('创建项目失败:', error);
      return res.status(500).json({ message: '创建项目失败', error: String(error) });
    }
  }

  static async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, description, location, startDate, endDate, status } = req.body;

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: '项目不存在' });
      }

      const updateData = {
        name,
        code,
        description,
        location,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status
      };

      const updatedProject = await Project.update(id, updateData);
      return res.status(200).json({ message: '项目更新成功', data: updatedProject });
    } catch (error) {
      console.error('更新项目失败:', error);
      return res.status(500).json({ message: '更新项目失败', error: String(error) });
    }
  }

  static async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const project = await Project.findById(id);
      if (!project) {
        return res.status(404).json({ message: '项目不存在' });
      }

      // 删除项目相关的楼层
      await Floor.deleteByProjectId(id);

      // 删除项目相关的预埋件 (新增: 确保数据清理干净)
      await EmbeddedPart.deleteByProjectId(id);

      // 删除项目
      await Project.delete(id);
      return res.status(200).json({ message: '项目删除成功' });
    } catch (error) {
      console.error('删除项目失败:', error);
      return res.status(500).json({ message: '删除项目失败', error: String(error) });
    }
  }

  // 楼层管理
  static async getFloors(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const floors = await Floor.findByProjectId(projectId);
      return res.status(200).json(floors);
    } catch (error) {
      console.error('获取楼层列表失败:', error);
      return res.status(500).json({ message: '获取楼层列表失败', error: String(error) });
    }
  }

  static async getFloorById(req: Request, res: Response) {
    try {
      const { floorId } = req.params;
      const floor = await Floor.findById(floorId);

      if (!floor) {
        return res.status(404).json({ message: '楼层不存在' });
      }

      // 获取楼层关联的模型
      const models = await Model.findByFloorId(floorId);

      return res.status(200).json({ ...floor, models });
    } catch (error) {
      console.error('获取楼层详情失败:', error);
      return res.status(500).json({ message: '获取楼层详情失败', error: String(error) });
    }
  }

  static async createFloor(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { name, level, height, description } = req.body;

      // 验证项目是否存在
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: '项目不存在' });
      }

      const floor = await Floor.create({
        projectId,
        name,
        level,
        height,
        description
      });

      return res.status(201).json({ message: '楼层创建成功', data: floor });
    } catch (error) {
      console.error('创建楼层失败:', error);
      return res.status(500).json({ message: '创建楼层失败', error: String(error) });
    }
  }

  static async updateFloor(req: Request, res: Response) {
    try {
      const { floorId } = req.params;
      const { name, level, height, description } = req.body;

      const floor = await Floor.findById(floorId);
      if (!floor) {
        return res.status(404).json({ message: '楼层不存在' });
      }

      const updateData = {
        name,
        level,
        height,
        description
      };

      const updatedFloor = await Floor.update(floorId, updateData);
      return res.status(200).json({ message: '楼层更新成功', data: updatedFloor });
    } catch (error) {
      console.error('更新楼层失败:', error);
      return res.status(500).json({ message: '更新楼层失败', error: String(error) });
    }
  }

  static async deleteFloor(req: Request, res: Response) {
    try {
      const { floorId } = req.params;

      const floor = await Floor.findById(floorId);
      if (!floor) {
        return res.status(404).json({ message: '楼层不存在' });
      }

      // 删除楼层相关的模型
      await Model.deleteByFloorId(floorId);

      // 删除楼层
      await Floor.delete(floorId);
      return res.status(200).json({ message: '楼层删除成功' });
    } catch (error) {
      console.error('删除楼层失败:', error);
      return res.status(500).json({ message: '删除楼层失败', error: String(error) });
    }
  }

  // 坐标配置管理
  static async getCoordinateConfig(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: '项目不存在' });
      }

      // 如果没有配置，返回默认配置
      const config = project.coordinateConfig || (Project.constructor as any).createDefaultCoordinateConfig?.() || {
        isConfigured: false,
        cadConfig: {
          originX: 0,
          originY: 0,
          rotation: 0,
          unit: 'mm',
          unitToMeter: 0.001,
          yAxisUp: true
        },
        modelConfig: {
          offsetX: 0,
          offsetY: 0,
          offsetZ: 0,
          scale: 1,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0
        }
      };

      return res.status(200).json(config);
    } catch (error) {
      console.error('获取坐标配置失败:', error);
      return res.status(500).json({ message: '获取坐标配置失败', error: String(error) });
    }
  }

  static async updateCoordinateConfig(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      const config = req.body;

      // 验证项目是否存在
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: '项目不存在' });
      }

      // 验证配置数据
      if (!config.cadConfig || !config.modelConfig) {
        return res.status(400).json({ message: '坐标配置数据不完整' });
      }

      const updatedProject = await Project.updateCoordinateConfig(projectId, config, userId);

      if (!updatedProject) {
        return res.status(500).json({ message: '更新坐标配置失败' });
      }

      return res.status(200).json({
        message: '坐标配置更新成功',
        data: updatedProject.coordinateConfig
      });
    } catch (error) {
      console.error('更新坐标配置失败:', error);
      return res.status(500).json({ message: '更新坐标配置失败', error: String(error) });
    }
  }
}

export default ProjectController;
