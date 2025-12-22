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
const ProjectController_1 = __importDefault(require("../controllers/ProjectController"));
const auth_1 = __importStar(require("../middleware/auth"));
const router = (0, express_1.Router)();
// 项目管理路由 - 应用可选认证，支持未登录用户访问
router.get('/', auth_1.default, ProjectController_1.default.getAllProjects);
router.get('/:id', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer', 'qualityInspector', 'installer'), ProjectController_1.default.getProjectById);
router.post('/', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin'), ProjectController_1.default.createProject);
router.put('/:id', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin'), ProjectController_1.default.updateProject);
router.delete('/:id', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin'), ProjectController_1.default.deleteProject);
// 楼层管理路由
router.get('/:projectId/floors', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer'), ProjectController_1.default.getFloors);
router.get('/:projectId/floors/:floorId', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ProjectController_1.default.getFloorById);
router.post('/:projectId/floors', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin'), ProjectController_1.default.createFloor);
router.put('/:projectId/floors/:floorId', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin'), ProjectController_1.default.updateFloor);
router.delete('/:projectId/floors/:floorId', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin'), ProjectController_1.default.deleteFloor);
exports.default = router;
