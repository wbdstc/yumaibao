import { ObjectId, Collection, Document } from 'mongodb';
import { getDB } from '../config/mongodb';
import { v4 as uuidv4 } from 'uuid';

export interface TechnicalManualAttributes {
    _id?: ObjectId;
    id: string;
    title: string;
    category: string;
    content: string; // Markdown format
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface TechnicalManualCreationAttributes {
    title: string;
    category: string;
    content: string;
    order?: number;
}

class TechnicalManualModel {
    private collection: Collection<Document> | null = null;

    private getCollection(): Collection<Document> {
        if (!this.collection) {
            const db = getDB();
            if (!db) {
                throw new Error('MongoDB连接未建立');
            }
            this.collection = db.collection('technical_manuals');
        }
        return this.collection as Collection<Document>;
    }

    async create(data: TechnicalManualCreationAttributes): Promise<TechnicalManualAttributes> {
        const now = new Date();
        const manual: TechnicalManualAttributes = {
            id: uuidv4(),
            ...data,
            order: data.order || 0,
            createdAt: now,
            updatedAt: now
        };

        const result = await this.getCollection().insertOne(manual);
        return { ...manual, _id: result.insertedId };
    }

    async findAll(query?: any): Promise<TechnicalManualAttributes[]> {
        return await this.getCollection().find<TechnicalManualAttributes>(query || {}).sort({ order: 1 }).toArray();
    }

    async findById(id: string): Promise<TechnicalManualAttributes | null> {
        return await this.getCollection().findOne<TechnicalManualAttributes>({ id });
    }

    async update(id: string, data: Partial<TechnicalManualCreationAttributes>): Promise<TechnicalManualAttributes | null> {
        const updateData = { ...data, updatedAt: new Date() };
        const result = await this.getCollection().findOneAndUpdate(
            { id },
            { $set: updateData },
            { returnDocument: 'after' }
        );
        return result ? result.value : null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.getCollection().deleteOne({ id });
        return result.deletedCount > 0;
    }

    // 按分类查询（支持前缀匹配，如 "安装教程-平板式预埋件"）
    async findByCategory(category: string): Promise<TechnicalManualAttributes[]> {
        return await this.getCollection().find<TechnicalManualAttributes>({
            category: { $regex: `^${category}`, $options: 'i' }
        }).sort({ order: 1 }).toArray();
    }

    // 搜索功能
    async search(keyword: string): Promise<TechnicalManualAttributes[]> {
        return await this.getCollection().find<TechnicalManualAttributes>({
            $or: [
                { title: { $regex: keyword, $options: 'i' } },
                { content: { $regex: keyword, $options: 'i' } }
            ]
        }).sort({ order: 1 }).toArray();
    }
}

export default new TechnicalManualModel();
