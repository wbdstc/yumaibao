import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

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
    iat: Date.now(),
  };
  
  const secret = process.env.JWT_SECRET || 'default_secret_key';
  // 使用数字（秒）而不是字符串作为expiresIn值
  const expiresIn = process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN) : 86400; // 默认24小时
  
  return jwt.sign(payload, secret, { expiresIn });
};

// JWT验证函数
export const verifyJWT = (token: string): jwt.JwtPayload | null => {
  try {
    const secret = process.env.JWT_SECRET || 'default_secret_key';
    return jwt.verify(token, secret) as jwt.JwtPayload;
  } catch (error) {
    return null;
  }
};
