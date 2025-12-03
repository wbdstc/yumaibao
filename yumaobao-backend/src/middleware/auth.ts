import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/auth';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // 获取Authorization头
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ message: '未提供认证令牌' });
    return;
  }
  
  // 检查Bearer格式
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    res.status(401).json({ message: '认证令牌格式不正确' });
    return;
  }
  
  const token = tokenParts[1];
  
  // 验证JWT令牌
  const decoded = verifyJWT(token);
  
  if (!decoded) {
    res.status(401).json({ message: '无效或过期的认证令牌' });
    return;
  }
  
  // 将用户信息附加到请求对象
  req.user = {
    userId: decoded.userId,
    role: decoded.role
  };
  
  next();
};

// 角色权限检查中间件
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: '未认证' });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: '没有足够的权限执行此操作' });
      return;
    }
    
    next();
  };
};

export default authenticate;
