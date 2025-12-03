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
const EmbeddedPartController_1 = __importDefault(require("../controllers/EmbeddedPartController"));
const auth_1 = __importStar(require("../middleware/auth"));
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// 文件上传配置
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
// 预埋件管理路由
router.get('/', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer'), EmbeddedPartController_1.default.getAllEmbeddedParts);
router.get('/:id', auth_1.default, EmbeddedPartController_1.default.getEmbeddedPartById);
router.post('/', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer'), EmbeddedPartController_1.default.createEmbeddedPart);
router.put('/:id', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), EmbeddedPartController_1.default.updateEmbeddedPart);
router.delete('/:id', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin'), EmbeddedPartController_1.default.deleteEmbeddedPart);
// 批量操作
router.post('/batch', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer'), EmbeddedPartController_1.default.batchCreateEmbeddedParts);
router.post('/import', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer'), upload.single('file'), EmbeddedPartController_1.default.importEmbeddedParts);
router.put('/batch/status', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), EmbeddedPartController_1.default.batchUpdateStatus);
// 按项目和楼层获取预埋件
router.get('/project/:projectId', auth_1.default, EmbeddedPartController_1.default.getEmbeddedPartsByProject);
router.get('/project/:projectId/floor/:floorId', auth_1.default, EmbeddedPartController_1.default.getEmbeddedPartsByFloor);
// 二维码相关
router.get('/:id/qrcode', auth_1.default, EmbeddedPartController_1.default.generateQRCode);
router.post('/:id/install', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer', 'installer'), EmbeddedPartController_1.default.confirmInstallation);
router.post('/:id/inspect', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'qualityInspector'), EmbeddedPartController_1.default.confirmInspection);
// 状态统计
router.get('/project/:projectId/stats', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer'), EmbeddedPartController_1.default.getStatusStats);
exports.default = router;
