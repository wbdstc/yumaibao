"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const auth_1 = require("../utils/auth");
// 使用types/express.d.ts中已定义的Request扩展接口
// interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     role: string;
//   };
// }
const authenticate = (req, _res, next) => {
    // 添加详细的调试日志
    console.log('=== 认证中间件调试信息 ===');
    console.log('请求URL:', req.url);
    console.log('请求方法:', req.method);
    console.log('请求头:', req.headers);
    console.log('请求查询参数:', req.query);
    // 获取Authorization头
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('未提供认证令牌，继续执行（可选认证）');
        next();
        return;
    }
    // 检查Bearer格式
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        console.log('认证令牌格式不正确，继续执行（可选认证）');
        next();
        return;
    }
    const token = tokenParts[1];
    // 验证JWT令牌
    const decoded = (0, auth_1.verifyJWT)(token);
    if (!decoded) {
        console.log('无效或过期的认证令牌，继续执行（可选认证）');
        next();
        return;
    }
    // 将用户信息附加到请求对象
    req.user = {
        id: decoded.userId,
        role: decoded.role
    };
    console.log('认证成功，用户信息:', req.user);
    next();
};
// 角色权限检查中间件
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
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
exports.authorize = authorize;
exports.default = authenticate;
