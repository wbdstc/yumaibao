"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("../config/mongodb");
const uuid_1 = require("uuid");
class ProjectModel {
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
            this.collection = db.collection('projects');
        }
        return this.collection;
    }
    // 创建新项目
    async create(projectData) {
        const now = new Date();
        const project = {
            id: (0, uuid_1.v4)(),
            status: 'planning', // 默认状态
            ...projectData,
            createdAt: now,
            updatedAt: now
        };
        const result = await this.getCollection().insertOne(project);
        return { ...project, _id: result.insertedId };
    }
    // 根据ID查找项目
    async findById(id) {
        const project = await this.getCollection().findOne({ id });
        return project;
    }
    // 查找所有项目
    async findAll(query) {
        const projects = await this.getCollection().find(query || {}).toArray();
        return projects;
    }
    // 根据用户ID查找项目
    async findByUserId(userId) {
        const projects = await this.getCollection().find({ createdBy: userId }).toArray();
        return projects;
    }
    // 更新项目信息
    async update(id, projectData) {
        const updateData = { ...projectData, updatedAt: new Date() };
        const result = await this.getCollection().findOneAndUpdate({ id }, { $set: updateData }, { returnDocument: 'after' });
        return result ? result.value : null;
    }
    // 删除项目
    async delete(id) {
        const result = await this.getCollection().deleteOne({ id });
        return result.deletedCount > 0;
    }
}
// 导出单例实例
exports.default = new ProjectModel();
