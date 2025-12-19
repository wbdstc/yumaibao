"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJWT = exports.generateJWT = exports.verifyPassword = exports.hashPassword = void 0;
const crypto = __importStar(require("crypto"));
const jwt = __importStar(require("jsonwebtoken"));
// import dotenv from 'dotenv';
// dotenv.config();
// 密码哈希函数
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};
exports.hashPassword = hashPassword;
// 密码验证函数
const verifyPassword = (password, hashedPassword) => {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
};
exports.verifyPassword = verifyPassword;
// JWT生成函数
const generateJWT = (userId, role) => {
    const payload = {
        userId,
        role,
        iat: Math.floor(Date.now() / 1000), // 转换为秒级时间戳
    };
    const secret = process.env.JWT_SECRET || 'default_secret_key';
    // 定义过期时间映射（秒）
    const expireMap = {
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
        }
        else {
            // 如果是带单位的字符串，从映射中查找
            const normalized = process.env.JWT_EXPIRES_IN.toLowerCase();
            if (expireMap[normalized]) {
                expiresInSeconds = expireMap[normalized];
            }
        }
    }
    return jwt.sign(payload, secret, { expiresIn: expiresInSeconds });
};
exports.generateJWT = generateJWT;
// JWT验证函数
const verifyJWT = (token) => {
    try {
        const secret = process.env.JWT_SECRET || 'default_secret_key';
        const decoded = jwt.verify(token, secret);
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.verifyJWT = verifyJWT;
