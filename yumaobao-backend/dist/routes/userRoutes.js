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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = __importDefault(require("../controllers/UserController"));
const auth_1 = __importStar(require("../middleware/auth"));
const router = (0, express_1.Router)();
// 公开路由
router.post('/register', UserController_1.default.register);
router.post('/login', UserController_1.default.login);
// 需要认证的路由
router.get('/me', auth_1.default, UserController_1.default.getCurrentUser);
// 需要管理员、项目工程师或项目管理员权限的路由
router.get('/', auth_1.default, (0, auth_1.authorize)('admin', 'projectManager', 'projectEngineer'), UserController_1.default.getAllUsers);
router.get('/:id', auth_1.default, (0, auth_1.authorize)('admin', 'projectManager', 'projectEngineer'), UserController_1.default.getUserById);
router.post('/', auth_1.default, (0, auth_1.authorize)('admin', 'projectManager', 'projectEngineer'), UserController_1.default.register);
router.put('/:id', auth_1.default, (0, auth_1.authorize)('admin', 'projectManager', 'projectEngineer'), UserController_1.default.updateUser);
router.delete('/:id', auth_1.default, (0, auth_1.authorize)('admin'), UserController_1.default.deleteUser);
// 个人信息管理路由
router.put('/me', auth_1.default, UserController_1.default.updateProfile);
router.delete('/me', auth_1.default, UserController_1.default.deleteProfile);
exports.default = router;
