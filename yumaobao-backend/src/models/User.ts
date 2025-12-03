import { ObjectId, Collection, Document } from 'mongodb';
import { getDB } from '../config/mongodb';
import { v4 as uuidv4 } from 'uuid';

export interface UserAttributes {
  _id?: ObjectId;
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'projectManager' | 'projectEngineer' | 'qualityInspector' | 'installer';
  avatar?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreationAttributes {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'projectManager' | 'projectEngineer' | 'qualityInspector' | 'installer';
  avatar?: string;
  phone?: string;
}

class UserModel {
  private collection: Collection<Document> | null = null;

  // 延迟获取集合实例，确保MongoDB连接已建立
  private getCollection(): Collection<Document> {
    if (!this.collection) {
      const db = getDB();
      if (!db) {
        throw new Error('MongoDB连接未建立');
      }
      this.collection = db.collection('users');
    }
    return this.collection as Collection<Document>;
  }

  // 创建新用户
  async create(userData: UserCreationAttributes): Promise<UserAttributes> {
    const now = new Date();
    const user: UserAttributes = {
      id: uuidv4(),
      ...userData,
      createdAt: now,
      updatedAt: now
    };

    const result = await this.getCollection().insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  // 根据ID查找用户
  async findById(id: string): Promise<UserAttributes | null> {
    const user = await this.getCollection().findOne<UserAttributes>({ id });
    return user;
  }

  // 根据邮箱查找用户
  async findByEmail(email: string): Promise<UserAttributes | null> {
    const user = await this.getCollection().findOne<UserAttributes>({ email });
    return user;
  }

  // 查找所有用户
  async findAll(): Promise<UserAttributes[]> {
    const users = await this.getCollection().find<UserAttributes>({}).toArray();
    return users;
  }

  // 更新用户信息
  async update(id: string, userData: Partial<UserCreationAttributes>): Promise<UserAttributes | null> {
    const updateData = { ...userData, updatedAt: new Date() };
    const result = await this.getCollection().findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return result ? result.value : null;
  }

  // 删除用户
  async delete(id: string): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ id });
    return result.deletedCount > 0;
  }
}

// 导出单例实例
export default new UserModel();
