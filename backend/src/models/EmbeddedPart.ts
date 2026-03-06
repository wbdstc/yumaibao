import { ObjectId, Collection, Document } from 'mongodb';
import { getDB } from '../config/mongodb';
import { v4 as uuidv4 } from 'uuid';

export interface EmbeddedPartAttributes {
  _id?: ObjectId;
  id: string;
  projectId: string;
  name: string;
  type: string;
  modelNumber: string;
  description?: string;
  location: string;
  floorId?: string;
  elevation?: number; // 自定义预埋件高度 (Z轴/Y轴高程)
  coordinates?: any; // JSON格式的三维坐标
  coordinates2D?: any; // JSON格式的二维坐标
  code?: string;
  qrCodeData: string;
  qrCodeUrl: string;
  status: 'pending' | 'installed' | 'inspected' | 'rejected' | 'completed';
  installationDate?: Date;
  installationPhotos?: string[];
  inspectorId?: string;
  inspectionDate?: Date;
  inspectionPhotos?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmbeddedPartCreationAttributes {
  id?: string;
  projectId: string;
  name: string;
  type: string;
  modelNumber: string;
  description?: string;
  location: string;
  floorId?: string;
  elevation?: number;
  coordinates?: any;
  coordinates2D?: any;
  code?: string;
  qrCodeData: string;
  qrCodeUrl: string;
  status?: 'pending' | 'installed' | 'inspected' | 'rejected' | 'completed';
  installationDate?: Date;
  installationPhotos?: string[];
  inspectorId?: string;
  inspectionDate?: Date;
  inspectionPhotos?: string[];
  notes?: string;
}

class EmbeddedPartModel {
  private collection: Collection<Document> | null = null;

  // 延迟获取集合实例，确保MongoDB连接已建立
  private getCollection(): Collection<Document> {
    if (!this.collection) {
      const db = getDB();
      if (!db) {
        throw new Error('MongoDB连接未建立');
      }
      this.collection = db.collection('embedded_parts');
    }
    return this.collection as Collection<Document>;
  }

  // 创建新嵌入部件
  async create(partData: EmbeddedPartCreationAttributes): Promise<EmbeddedPartAttributes> {
    const now = new Date();
    const part: EmbeddedPartAttributes = {
      id: uuidv4(),
      ...partData,
      status: partData.status || 'pending',
      createdAt: now,
      updatedAt: now
    };

    const result = await this.getCollection().insertOne(part);
    return { ...part, _id: result.insertedId };
  }

  // 根据ID查找嵌入部件
  async findById(id: string): Promise<EmbeddedPartAttributes | null> {
    const part = await this.getCollection().findOne<EmbeddedPartAttributes>({ id });
    return part;
  }

  // 根据项目ID查找嵌入部件
  async findByProjectId(projectId: string): Promise<EmbeddedPartAttributes[]> {
    const parts = await this.getCollection().find<EmbeddedPartAttributes>({ projectId }).toArray();
    return parts;
  }

  // 查找所有嵌入部件
  async findAll(query?: any): Promise<EmbeddedPartAttributes[]> {
    const parts = await this.getCollection().find<EmbeddedPartAttributes>(query || {}).toArray();
    return parts;
  }

  // 更新嵌入部件信息
  async update(id: string, partData: Partial<EmbeddedPartCreationAttributes>): Promise<EmbeddedPartAttributes | null> {
    const updateData = { ...partData, updatedAt: new Date() };
    const result = await this.getCollection().findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return result ? result.value : null;
  }

  // 批量更新嵌入部件信息
  async batchUpdate(ids: string[], partData: Partial<EmbeddedPartCreationAttributes>): Promise<number> {
    const updateData = { ...partData, updatedAt: new Date() };
    const result = await this.getCollection().updateMany(
      { id: { $in: ids } },
      { $set: updateData }
    );
    return result.modifiedCount;
  }

  // 删除嵌入部件
  async delete(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ id });
    return result.deletedCount > 0;
  }

  // 根据项目ID删除所有嵌入部件
  async deleteByProjectId(projectId: string): Promise<boolean> {
    const result = await this.getCollection().deleteMany({ projectId });
    return result.deletedCount > 0;
  }

  // 批量删除嵌入部件
  async batchDelete(ids: string[]): Promise<number> {
    const result = await this.getCollection().deleteMany({ id: { $in: ids } });
    return result.deletedCount;
  }
}

// 导出单例实例
export default new EmbeddedPartModel();
