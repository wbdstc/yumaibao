import { ObjectId, Collection, Document } from 'mongodb';
import { getDB } from '../config/mongodb';
import { v4 as uuidv4 } from 'uuid';

export interface ModelAttributes {
  _id?: ObjectId;
  id: string;
  projectId: string;
  floorId?: string;
  name: string;
  type: 'bim' | 'cad' | '2d' | '3d';
  fileUrl: string;
  lightweightUrl?: string;
  thumbnailUrl?: string;
  fileSize: number;
  lightweightSize?: number;
  format: string;
  version: string;
  uploadedBy: string;
  uploadedAt: Date;
  updatedAt?: Date;
  description?: string;
  isLightweight?: boolean;
  metadata?: Record<string, any>;
}

export interface ModelCreationAttributes {
  id?: string;
  projectId: string;
  floorId?: string;
  name: string;
  type: 'bim' | 'cad' | '2d' | '3d';
  fileUrl: string;
  lightweightUrl?: string;
  thumbnailUrl?: string;
  fileSize: number;
  lightweightSize?: number;
  format: string;
  version?: string;
  uploadedBy: string;
  description?: string;
  isLightweight?: boolean;
  metadata?: Record<string, any>;
}

class ModelModel {
  private collection: Collection<Document> | null = null;

  // 延迟获取集合实例，确保MongoDB连接已建立
  private getCollection(): Collection<Document> {
    if (!this.collection) {
      const db = getDB();
      if (!db) {
        throw new Error('MongoDB连接未建立');
      }
      this.collection = db.collection('models');
    }
    return this.collection as Collection<Document>;
  }

  // 创建新模型
  async create(modelData: ModelCreationAttributes): Promise<ModelAttributes> {
    const now = new Date();
    const model: ModelAttributes = {
      id: uuidv4(),
      ...modelData,
      version: modelData.version || '1.0',
      uploadedAt: now
    };

    const result = await this.getCollection().insertOne(model);
    return { ...model, _id: result.insertedId };
  }

  // 根据ID查找模型
  async findById(id: string): Promise<ModelAttributes | null> {
    const model = await this.getCollection().findOne<ModelAttributes>({ id });
    return model;
  }

  // 根据项目ID查找模型
  async findByProjectId(projectId: string): Promise<ModelAttributes[]> {
    const models = await this.getCollection().find<ModelAttributes>({ projectId }).toArray();
    return models;
  }

  // 根据楼层ID查找模型
  async findByFloorId(floorId: string): Promise<ModelAttributes[]> {
    const models = await this.getCollection().find<ModelAttributes>({ floorId }).toArray();
    return models;
  }

  // 查找所有模型，支持条件过滤
  async findAll(whereClause: any = {}): Promise<ModelAttributes[]> {
    const models = await this.getCollection().find<ModelAttributes>(whereClause).toArray();
    return models;
  }

  // 更新模型信息
  async update(id: string, modelData: Partial<ModelCreationAttributes>): Promise<ModelAttributes | null> {
    const updateData = { ...modelData, updatedAt: new Date() };
    const result = await this.getCollection().findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return result ? result.value : null;
  }

  // 删除模型
  async delete(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ id });
    return result.deletedCount > 0;
  }

  // 根据项目ID删除所有模型
  async deleteByProjectId(projectId: string): Promise<boolean> {
    const result = await this.getCollection().deleteMany({ projectId });
    return result.deletedCount > 0;
  }

  // 根据楼层ID删除所有模型
  async deleteByFloorId(floorId: string): Promise<boolean> {
    const result = await this.getCollection().deleteMany({ floorId });
    return result.deletedCount > 0;
  }
}

// 导出单例实例
export default new ModelModel();
