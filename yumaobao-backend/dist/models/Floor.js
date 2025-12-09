"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("../config/mongodb");
const uuid_1 = require("uuid");
class FloorModel {
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
            this.collection = db.collection('floors');
        }
        return this.collection;
    }
    // 创建新楼层
    async create(floorData) {
        const now = new Date();
        const floor = {
            id: (0, uuid_1.v4)(),
            ...floorData,
            createdAt: now,
            updatedAt: now
        };
        const result = await this.getCollection().insertOne(floor);
        return { ...floor, _id: result.insertedId };
    }
    // 根据ID查找楼层
    async findById(id) {
        const floor = await this.getCollection().findOne({ id });
        return floor;
    }
    // 根据项目ID查找楼层
    async findByProjectId(projectId) {
        const floors = await this.getCollection().find({ projectId }).toArray();
        return floors;
    }
    // 查找所有楼层
    async findAll(query) {
        const floors = await this.getCollection().find(query || {}).toArray();
        return floors;
    }
    // 更新楼层信息
    async update(id, floorData) {
        const updateData = { ...floorData, updatedAt: new Date() };
        const result = await this.getCollection().findOneAndUpdate({ id }, { $set: updateData }, { returnDocument: 'after' });
        return result ? result.value : null;
    }
    // 删除楼层
    async delete(id) {
        const result = await this.getCollection().deleteOne({ id });
        return result.deletedCount > 0;
    }
    // 根据项目ID删除所有楼层
    async deleteByProjectId(projectId) {
        const result = await this.getCollection().deleteMany({ projectId });
        return result.deletedCount > 0;
    }
}
// 导出单例实例
exports.default = new FloorModel();
