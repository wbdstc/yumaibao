"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("../config/mongodb");
const uuid_1 = require("uuid");
class EmbeddedPartModel {
    constructor() {
        this.collection = null;
    }
    // 延迟获取集合实例，确保MongoDB连接已建立
    getCollection() {
        if (!this.collection) {
            const db = (0, mongodb_1.getDB)();
            if (!db) {
                throw new Error('MongoDB连接未建立');
            }
            this.collection = db.collection('embedded_parts');
        }
        return this.collection;
    }
    // 创建新嵌入部件
    async create(partData) {
        const now = new Date();
        const part = {
            id: (0, uuid_1.v4)(),
            ...partData,
            status: partData.status || 'pending',
            createdAt: now,
            updatedAt: now
        };
        const result = await this.getCollection().insertOne(part);
        return { ...part, _id: result.insertedId };
    }
    // 根据ID查找嵌入部件
    async findById(id) {
        const part = await this.getCollection().findOne({ id });
        return part;
    }
    // 根据项目ID查找嵌入部件
    async findByProjectId(projectId) {
        const parts = await this.getCollection().find({ projectId }).toArray();
        return parts;
    }
    // 查找所有嵌入部件
    async findAll(query) {
        const parts = await this.getCollection().find(query || {}).toArray();
        return parts;
    }
    // 更新嵌入部件信息
    async update(id, partData) {
        const updateData = { ...partData, updatedAt: new Date() };
        const result = await this.getCollection().findOneAndUpdate({ id }, { $set: updateData }, { returnDocument: 'after' });
        return result ? result.value : null;
    }
    // 批量更新嵌入部件信息
    async batchUpdate(ids, partData) {
        const updateData = { ...partData, updatedAt: new Date() };
        const result = await this.getCollection().updateMany({ id: { $in: ids } }, { $set: updateData });
        return result.modifiedCount;
    }
    // 删除嵌入部件
    async delete(id) {
        const result = await this.getCollection().deleteOne({ id });
        return result.deletedCount > 0;
    }
    // 根据项目ID删除所有嵌入部件
    async deleteByProjectId(projectId) {
        const result = await this.getCollection().deleteMany({ projectId });
        return result.deletedCount > 0;
    }
}
// 导出单例实例
exports.default = new EmbeddedPartModel();
