"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("../config/mongodb");
const uuid_1 = require("uuid");
class ModelModel {
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
            this.collection = db.collection('models');
        }
        return this.collection;
    }
    // 创建新模型
    async create(modelData) {
        const now = new Date();
        const model = {
            id: (0, uuid_1.v4)(),
            ...modelData,
            version: modelData.version || '1.0',
            uploadedAt: now
        };
        const result = await this.getCollection().insertOne(model);
        return { ...model, _id: result.insertedId };
    }
    // 根据ID查找模型
    async findById(id) {
        const model = await this.getCollection().findOne({ id });
        return model;
    }
    // 根据项目ID查找模型
    async findByProjectId(projectId) {
        const models = await this.getCollection().find({ projectId }).toArray();
        return models;
    }
    // 根据楼层ID查找模型
    async findByFloorId(floorId) {
        const models = await this.getCollection().find({ floorId }).toArray();
        return models;
    }
    // 查找所有模型，支持条件过滤
    async findAll(whereClause = {}) {
        const models = await this.getCollection().find(whereClause).toArray();
        return models;
    }
    // 更新模型信息
    async update(id, modelData) {
        const updateData = { ...modelData, updatedAt: new Date() };
        const result = await this.getCollection().findOneAndUpdate({ id }, { $set: updateData }, { returnDocument: 'after' });
        return result ? result.value : null;
    }
    // 删除模型
    async delete(id) {
        const result = await this.getCollection().deleteOne({ id });
        return result.deletedCount > 0;
    }
    // 根据项目ID删除所有模型
    async deleteByProjectId(projectId) {
        const result = await this.getCollection().deleteMany({ projectId });
        return result.deletedCount > 0;
    }
    // 根据楼层ID删除所有模型
    async deleteByFloorId(floorId) {
        const result = await this.getCollection().deleteMany({ floorId });
        return result.deletedCount > 0;
    }
}
// 导出单例实例
exports.default = new ModelModel();
