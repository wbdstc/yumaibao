import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, verifyPassword, generateJWT } from '../utils/auth';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'projectManager' | 'projectEngineer' | 'qualityInspector' | 'installer';
  phone?: string;
}

interface LoginRequest {
  email: string;
  password: string;
  role?: string; // 兼容前端发送的role参数
}

class UserController {
  // 用户注册
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, role, phone } = req.body as RegisterRequest;
      
      // 检查邮箱是否已存在
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: '该邮箱已被注册' });
      }
      
      // 哈希密码
      const hashedPassword = hashPassword(password);
      
      // 创建新用户
      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone
      });
      
      // 生成JWT令牌
      const token = generateJWT(String(newUser.id), newUser.role as string);
      
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
    } catch (error) {
      console.error('注册失败:', error);
      return res.status(500).json({ message: '服务器内部错误' });
    }
  }
  
  // 用户登录
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body as LoginRequest;
      
      // 查找用户
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: '邮箱或密码错误' });
      }
      
      // 验证密码
      if (!verifyPassword(password, user.password)) {
        return res.status(401).json({ message: '邮箱或密码错误' });
      }
      
      // 生成JWT令牌
      const token = generateJWT(String(user.id), user.role as string);
      
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
    } catch (error) {
      console.error('登录失败:', error);
      return res.status(500).json({ message: '服务器内部错误' });
    }
  }
  
  // 获取当前用户信息
  static async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      
      // 查找用户
      const user = await User.findByPk(userId, {
        attributes: ['id', 'name', 'email', 'role', 'phone', 'avatar', 'createdAt']
      });
      
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }
      
      return res.status(200).json({
        user
      });
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return res.status(500).json({ message: '服务器内部错误' });
    }
  }
}

export default UserController;
