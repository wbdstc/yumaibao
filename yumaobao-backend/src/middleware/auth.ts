import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/auth';

// 使用types/express.d.ts中已定义的Request扩展接口
// interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     role: string;
//   };
// }

const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // 打印认证请求信息
  console.log('\n--- 认证中间件开始处理请求 ---');
  console.log('请求方法:', req.method);
  console.log('请求URL:', req.url);
  
  // 获取Authorization头
  const authHeader = req.headers.authorization;
  console.log('请求头Authorization:', authHeader);
  
  if (!authHeader) {
    console.log('认证失败：未提供认证令牌');
    res.status(401).json({ message: '未提供认证令牌' });
    return;
  }
  
  // 检查Bearer格式
  const tokenParts = authHeader.split(' ');
  console.log('令牌部分:', tokenParts);
  
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    console.log('认证失败：认证令牌格式不正确');
    res.status(401).json({ message: '认证令牌格式不正确' });
    return;
  }
  
  const token = tokenParts[1];
  console.log('提取到的令牌:', token);
  
  // 验证JWT令牌
  console.log('开始验证JWT令牌...');
  const decoded = verifyJWT(token);
  
  if (!decoded) {
    console.log('认证失败：无效或过期的认证令牌');
    res.status(401).json({ message: '无效或过期的认证令牌' });
    return;
  }
  
  // 将用户信息附加到请求对象
  (req as any).user = {
    id: decoded.userId,
    role: decoded.role
  };
  
  console.log('认证成功！用户信息已附加到请求:', (req as any).user);
  console.log('--- 认证中间件处理完成 ---');
  
  next();
};

// 角色权限检查中间件
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!(req as any).user) {
      res.status(401).json({ message: '未认证' });
      return;
    }
    
    if (!allowedRoles.includes((req as any).user.role)) {
      res.status(403).json({ message: '没有足够的权限执行此操作' });
      return;
    }
    
    next();
  };
};

export default authenticate;
