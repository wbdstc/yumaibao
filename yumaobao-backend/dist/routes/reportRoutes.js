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
const ReportController_1 = __importDefault(require("../controllers/ReportController"));
const auth_1 = __importStar(require("../middleware/auth"));
const router = (0, express_1.Router)();
// 报告生成路由 - 适配前端API调用
router.post('/project-progress/:projectId', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer'), ReportController_1.default.generateProjectProgressReport);
router.post('/embedded-parts-status', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ReportController_1.default.generateEmbeddedPartStatusReport);
router.post('/generate-file', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ReportController_1.default.generateReportFile);
// 保留原有GET路由以支持向后兼容
router.get('/project-progress', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer'), ReportController_1.default.generateProjectProgressReport);
router.get('/embedded-part-status', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ReportController_1.default.generateEmbeddedPartStatusReport);
router.get('/project-report', auth_1.default, (0, auth_1.authorize)('projectManager', 'admin', 'projectEngineer', 'qualityInspector'), ReportController_1.default.generateProjectReportFile);
router.get('/download', auth_1.default, ReportController_1.default.generateProjectReportFile);
exports.default = router;
