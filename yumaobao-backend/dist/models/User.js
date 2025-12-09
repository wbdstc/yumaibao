"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("../config/mongodb");
const uuid_1 = require("uuid");
class UserModel {
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
            this.collection = db.collection('users');
        }
        return this.collection;
    }
    // 创建新用户
    async create(userData) {
        const now = new Date();
        const user = {
            id: (0, uuid_1.v4)(),
            ...userData,
            createdAt: now,
            updatedAt: now
        };
        const result = await this.getCollection().insertOne(user);
        return { ...user, _id: result.insertedId };
    }
    // 根据ID查找用户
    async findById(id) {
        const user = await this.getCollection().findOne({ id });
        return user;
    }
    // 根据邮箱查找用户
    async findByEmail(email) {
        const user = await this.getCollection().findOne({ email });
        return user;
    }
    // 根据手机号查找用户
    async findByPhone(phone) {
        const user = await this.getCollection().findOne({ phone });
        return user;
    }
    // 查找所有用户
    async findAll() {
        const users = await this.getCollection().find({}).toArray();
        return users;
    }
    // 更新用户信息
    async update(id, userData) {
        const updateData = { ...userData, updatedAt: new Date() };
        const result = await this.getCollection().findOneAndUpdate({ id }, { $set: updateData }, { returnDocument: 'after' });
        return result ? result.value : null;
    }
    // 删除用户
    async delete(id) {
        const result = await this.getCollection().deleteOne({ id });
        return result.deletedCount > 0;
    }
}
// 导出单例实例
exports.default = new UserModel();
