import { ObjectId, Collection, Document } from 'mongodb';
import { getDB } from '../config/mongodb';
import { v4 as uuidv4 } from 'uuid';

export interface ProjectAttributes {
  _id?: ObjectId;
  id: string;
  code: string;
  name: string;
  description?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  status: 'planning' | 'under_construction' | 'completed';
  createdBy: string;
  users: string[]; // 关联的用户ID数组
  createdAt: Date;
  updatedAt: Date;

  // 坐标系统配置
  coordinateConfig?: ProjectCoordinateConfig;
}

/**
 * 项目坐标系统配置
 */
export interface ProjectCoordinateConfig {
  /** 是否已配置 */
  isConfigured: boolean;

  /** GPS基准点（项目原点的GPS位置） */
  gpsOrigin?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };

  /** CAD坐标系配置 */
  cadConfig: {
    /** CAD原点X坐标（在CAD图纸中的坐标） */
    originX: number;
    /** CAD原点Y坐标 */
    originY: number;
    /** 与真北的夹角（度），顺时针为正 */
    rotation: number;
    /** 坐标单位 */
    unit: 'mm' | 'cm' | 'm';
    /** 单位到米的转换比例 */
    unitToMeter: number;
    /** 是否Y轴向上（CAD标准） */
    yAxisUp: boolean;
  };

  /** 3D模型配置 */
  modelConfig: {
    /** 模型原点偏移X */
    offsetX: number;
    /** 模型原点偏移Y（高度方向） */
    offsetY: number;
    /** 模型原点偏移Z */
    offsetZ: number;
    /** 模型缩放比例 */
    scale: number;
    /** X轴旋转（度） */
    rotationX: number;
    /** Y轴旋转（度） */
    rotationY: number;
    /** Z轴旋转（度） */
    rotationZ: number;
  };

  /** 配置更新时间 */
  lastUpdated?: Date;
  /** 配置人 */
  configuredBy?: string;
}

export interface ProjectCreationAttributes {
  code: string;
  name: string;
  description?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'planning' | 'under_construction' | 'completed';
  createdBy: string;
  users?: string[]; // 可选的用户ID数组，用于创建时分配用户
}

class ProjectModel {
  private collection: Collection<Document> | null = null;

  // 延迟获取集合实例，确保MongoDB连接已建立
  private getCollection(): Collection<Document> {
    if (!this.collection) {
      const db = getDB();
      if (!db) {
        throw new Error('MongoDB连接未建立');
      }
      this.collection = db.collection('projects');
    }
    return this.collection as Collection<Document>;
  }

  // 创建新项目
  async create(projectData: ProjectCreationAttributes): Promise<ProjectAttributes> {
    const now = new Date();
    const project: ProjectAttributes = {
      id: uuidv4(),
      status: 'planning', // 默认状态
      ...projectData,
      users: projectData.users || [], // 确保users始终是数组
      createdAt: now,
      updatedAt: now
    };

    const result = await this.getCollection().insertOne(project);
    return { ...project, _id: result.insertedId };
  }

  // 根据ID查找项目
  async findById(id: string): Promise<ProjectAttributes | null> {
    const project = await this.getCollection().findOne<ProjectAttributes>({ id });
    // 确保users字段始终是数组
    if (project && !project.users) {
      project.users = [];
    }
    return project;
  }

  // 查找所有项目
  async findAll(query?: any): Promise<ProjectAttributes[]> {
    const projects = await this.getCollection().find<ProjectAttributes>(query || {}).toArray();
    // 确保每个项目的users字段始终是数组
    return projects.map(project => {
      if (!project.users) {
        project.users = [];
      }
      return project;
    });
  }

  // 根据用户ID查找项目
  async findByUserId(userId: string): Promise<ProjectAttributes[]> {
    const projects = await this.getCollection().find<ProjectAttributes>({ createdBy: userId }).toArray();
    return projects;
  }

  // 更新项目信息
  async update(id: string, projectData: Partial<ProjectCreationAttributes>): Promise<ProjectAttributes | null> {
    const updateData = { ...projectData, updatedAt: new Date() };
    const result = await this.getCollection().findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return result ? result.value : null;
  }

  // 删除项目
  async delete(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ id });
    return result.deletedCount > 0;
  }

  // 更新项目坐标配置
  async updateCoordinateConfig(
    id: string,
    config: ProjectCoordinateConfig,
    userId?: string
  ): Promise<ProjectAttributes | null> {
    const updateConfig: ProjectCoordinateConfig = {
      ...config,
      isConfigured: true,
      lastUpdated: new Date(),
      configuredBy: userId
    };

    const result = await this.getCollection().findOneAndUpdate(
      { id },
      {
        $set: {
          coordinateConfig: updateConfig,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    return result ? result.value : null;
  }

  // 获取项目坐标配置
  async getCoordinateConfig(id: string): Promise<ProjectCoordinateConfig | null> {
    const project = await this.findById(id);
    return project?.coordinateConfig || null;
  }

  // 创建默认坐标配置
  static createDefaultCoordinateConfig(): ProjectCoordinateConfig {
    return {
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
  }
}

// 导出单例实例
export default new ProjectModel();
