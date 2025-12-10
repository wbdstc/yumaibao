import { Request, Response } from 'express';
import Project from '../models/Project';
import Floor from '../models/Floor';
import Model from '../models/Model';
import User from '../models/User';

class ProjectController {
  // 项目管理
  static async getAllProjects(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      let projects: any[];
      
      if (!user) {
        // 未登录用户（如注册页面）可以查看所有项目用于选择
        projects = await Project.findAll();
      } else if (user.role === 'admin') {
        // 管理员可以查看所有项目
        projects = await Project.findAll();
      } else if (user.role === 'projectManager' || user.role === 'projectEngineer') {
        // 项目管理员和工程师可以查看自己创建的项目
        projects = await Project.findByUserId(user.id);
      } else if (user.role === 'qualityInspector' || user.role === 'installer') {
        // 质检人员和安装人员只能查看自己关联的项目
        const userData = await User.findById(user.id);
        if (userData && userData.projects && userData.projects.length > 0) {
          projects = await Project.findAll({ id: { $in: userData.projects } });
        } else {
          projects = [];
        }
      } else {
        return res.status(403).json({ message: '无权访问项目列表' });
      }
      
      return res.status(200).json(projects);
    } catch (error) {
      console.error('获取项目列表失败:', error);
      return res.status(500).json({ message: '获取项目列表失败', error: String(error) });
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
}

export default ProjectController;
