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
    return projects;
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
}

// 导出单例实例
export default new ProjectModel();
