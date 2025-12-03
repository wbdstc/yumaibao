import { ObjectId, Collection, Document } from 'mongodb';
import { getDB } from '../config/mongodb';
import { v4 as uuidv4 } from 'uuid';

export interface FloorAttributes {
  _id?: ObjectId;
  id: string;
  projectId: string;
  name: string;
  level: number;
  height: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FloorCreationAttributes {
  projectId: string;
  name: string;
  level: number;
  height: number;
  description?: string;
}

class FloorModel {
  private collection: Collection<Document> | null = null;

  // 延迟获取集合实例，确保MongoDB连接已建立
  private getCollection(): Collection<Document> {
    if (!this.collection) {
      const db = getDB();
      if (!db) {
        throw new Error('MongoDB连接未建立');
      }
      this.collection = db.collection('floors');
    }
    return this.collection as Collection<Document>;
  }

  // 创建新楼层
  async create(floorData: FloorCreationAttributes): Promise<FloorAttributes> {
    const now = new Date();
    const floor: FloorAttributes = {
      id: uuidv4(),
      ...floorData,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.getCollection().insertOne(floor);
    return { ...floor, _id: result.insertedId };
  }

  // 根据ID查找楼层
  async findById(id: string): Promise<FloorAttributes | null> {
    const floor = await this.getCollection().findOne<FloorAttributes>({ id });
    return floor;
  }

  // 根据项目ID查找楼层
  async findByProjectId(projectId: string): Promise<FloorAttributes[]> {
    const floors = await this.getCollection().find<FloorAttributes>({ projectId }).toArray();
    return floors;
  }

  // 查找所有楼层
  async findAll(query?: any): Promise<FloorAttributes[]> {
    const floors = await this.getCollection().find<FloorAttributes>(query || {}).toArray();
    return floors;
  }

  // 更新楼层信息
  async update(id: string, floorData: Partial<FloorCreationAttributes>): Promise<FloorAttributes | null> {
    const updateData = { ...floorData, updatedAt: new Date() };
    const result = await this.getCollection().findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return result ? result.value : null;
  }

  // 删除楼层
  async delete(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ id });
    return result.deletedCount > 0;
  }

  // 根据项目ID删除所有楼层
  async deleteByProjectId(projectId: string): Promise<boolean> {
    const result = await this.getCollection().deleteMany({ projectId });
    return result.deletedCount > 0;
  }
}

// 导出单例实例
export default new FloorModel();
