"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../utils/auth");
class UserController {
    // 用户注册
    static async register(req, res) {
        try {
            const { name, email, password, role, phone } = req.body;
            // 检查邮箱是否已存在
            const existingUser = await User_1.default.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: '该邮箱已被注册' });
            }
            // 哈希密码
            const hashedPassword = (0, auth_1.hashPassword)(password);
            // 创建新用户
            const newUser = await User_1.default.create({
                name,
                email,
                password: hashedPassword,
                role,
                phone
            });
            // 生成JWT令牌
            const token = (0, auth_1.generateJWT)(String(newUser.id), newUser.role);
            // 返回用户信息和令牌
            return res.status(201).json({
                message: '用户注册成功',
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    phone: newUser.phone,
                    avatar: newUser.avatar
                },
                token
            });
        }
        catch (error) {
            console.error('注册失败:', error);
            return res.status(500).json({ message: '服务器内部错误' });
        }
    }
    // 用户登录
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            // 查找用户
            const user = await User_1.default.findByEmail(email);
            if (!user) {
                return res.status(401).json({ message: '邮箱或密码错误' });
            }
            // 验证密码
            if (!(0, auth_1.verifyPassword)(password, user.password)) {
                return res.status(401).json({ message: '邮箱或密码错误' });
            }
            // 生成JWT令牌
            const token = (0, auth_1.generateJWT)(String(user.id), user.role);
            // 返回用户信息和令牌
            return res.status(200).json({
                message: '登录成功',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    avatar: user.avatar
                },
                token
            });
        }
        catch (error) {
            console.error('登录失败:', error);
            return res.status(500).json({ message: '服务器内部错误' });
        }
    }
    // 获取当前用户信息
    static async getCurrentUser(req, res) {
        try {
            const userId = req.user?.userId;
            // 查找用户
            const user = await User_1.default.findById(userId);
            if (!user) {
                return res.status(404).json({ message: '用户不存在' });
            }
            // 只返回需要的字段
            const { password, ...userWithoutPassword } = user;
            return res.status(200).json({
                user: userWithoutPassword
            });
        }
        catch (error) {
            console.error('获取用户信息失败:', error);
            return res.status(500).json({ message: '服务器内部错误' });
        }
    }
    // 获取所有用户（管理员权限）
    static async getAllUsers(_req, res) {
        try {
            const users = await User_1.default.findAll();
            // 过滤掉密码字段
            const usersWithoutPassword = users.map(user => {
                const { password, ...userData } = user;
                return userData;
            });
            return res.status(200).json({
                users: usersWithoutPassword,
                total: usersWithoutPassword.length
            });
        }
        catch (error) {
            console.error('获取所有用户失败:', error);
            return res.status(500).json({ message: '服务器内部错误' });
        }
    }
    // 根据ID获取用户（管理员权限）
    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await User_1.default.findById(id);
            if (!user) {
                return res.status(404).json({ message: '用户不存在' });
            }
            // 只返回需要的字段
            const { password, ...userWithoutPassword } = user;
            return res.status(200).json({
                user: userWithoutPassword
            });
        }
        catch (error) {
            console.error('获取用户失败:', error);
            return res.status(500).json({ message: '服务器内部错误' });
        }
    }
    // 更新用户信息（管理员权限）
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, email, role, phone, avatar } = req.body;
            // 检查用户是否存在
            const existingUser = await User_1.default.findById(id);
            if (!existingUser) {
                return res.status(404).json({ message: '用户不存在' });
            }
            // 检查邮箱是否已被其他用户使用
            if (email && email !== existingUser.email) {
                const emailUser = await User_1.default.findByEmail(email);
                if (emailUser) {
                    return res.status(400).json({ message: '该邮箱已被使用' });
                }
            }
            // 更新用户信息
            const updateData = {
                name: name || existingUser.name,
                email: email || existingUser.email,
                role: role || existingUser.role,
                phone: phone || existingUser.phone,
                avatar: avatar || existingUser.avatar
            };
            const updatedUser = await User_1.default.update(id, updateData);
            if (!updatedUser) {
                return res.status(500).json({ message: '更新用户信息失败' });
            }
            // 只返回需要的字段
            const { password, ...userWithoutPassword } = updatedUser;
            return res.status(200).json({
                message: '用户信息更新成功',
                user: userWithoutPassword
            });
        }
        catch (error) {
            console.error('更新用户信息失败:', error);
            return res.status(500).json({ message: '服务器内部错误' });
        }
    }
    // 删除用户（管理员权限）
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            // 检查用户是否存在
            const existingUser = await User_1.default.findById(id);
            if (!existingUser) {
                return res.status(404).json({ message: '用户不存在' });
            }
            // 删除用户
            await User_1.default.delete(id);
            return res.status(200).json({
                message: '用户删除成功'
            });
        }
        catch (error) {
            console.error('删除用户失败:', error);
            return res.status(500).json({ message: '服务器内部错误' });
        }
    }
    // 更新个人信息
    static async updateProfile(req, res) {
        try {
            const userId = req.user?.userId;
            const { name, phone, avatar } = req.body;
            // 检查用户是否存在
            const existingUser = await User_1.default.findById(userId);
            if (!existingUser) {
                return res.status(404).json({ message: '用户不存在' });
            }
            // 更新用户信息（不允许修改角色和邮箱）
            const updateData = {
                name: name || existingUser.name,
                phone: phone || existingUser.phone,
                avatar: avatar || existingUser.avatar
            };
            const updatedUser = await User_1.default.update(userId, updateData);
            if (!updatedUser) {
                return res.status(500).json({ message: '更新个人信息失败' });
            }
            // 只返回需要的字段
            const { password, ...userWithoutPassword } = updatedUser;
            return res.status(200).json({
                message: '个人信息更新成功',
                user: userWithoutPassword
            });
        }
        catch (error) {
            console.error('更新个人信息失败:', error);
            return res.status(500).json({ message: '服务器内部错误' });
        }
    }
    // 删除个人账号
    static async deleteProfile(req, res) {
        try {
            const userId = req.user?.userId;
            // 检查用户是否存在
            const existingUser = await User_1.default.findById(userId);
            if (!existingUser) {
                return res.status(404).json({ message: '用户不存在' });
            }
            // 删除用户
            await User_1.default.delete(userId);
            return res.status(200).json({
                message: '账号删除成功'
            });
        }
        catch (error) {
            console.error('删除账号失败:', error);
            return res.status(500).json({ message: '服务器内部错误' });
        }
    }
}
exports.default = UserController;
