import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
// import dotenv from 'dotenv';

// dotenv.config();

// 密码哈希函数
export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

// 密码验证函数
export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

// JWT生成函数
export const generateJWT = (userId: string, role: string): string => {
  const payload = {
    userId,
    role,
    iat: Math.floor(Date.now() / 1000), // 转换为秒级时间戳
  };
  
  const secret = process.env.JWT_SECRET || 'default_secret_key';
  
  // 定义过期时间映射（秒）
  const expireMap: Record<string, number> = {
    '1h': 3600,
    '1d': 86400,
    '7d': 604800,
    '30d': 2592000
  };
  
  // 获取并解析过期时间
  let expiresInSeconds = expireMap['7d']; // 默认7天
  if (process.env.JWT_EXPIRES_IN) {
    // 如果是数字字符串，直接转换
    if (/^\d+$/.test(process.env.JWT_EXPIRES_IN)) {
      expiresInSeconds = parseInt(process.env.JWT_EXPIRES_IN);
    } else {
      // 如果是带单位的字符串，从映射中查找
      const normalized = process.env.JWT_EXPIRES_IN.toLowerCase();
      if (expireMap[normalized]) {
        expiresInSeconds = expireMap[normalized];
      }
    }
  }
  
  return jwt.sign(payload, secret, { expiresIn: expiresInSeconds });
};

// JWT验证函数
export const verifyJWT = (token: string): jwt.JwtPayload | null => {
  try {
    const secret = process.env.JWT_SECRET || 'default_secret_key';
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
