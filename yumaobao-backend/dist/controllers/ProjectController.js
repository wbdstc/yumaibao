"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Project_1 = __importDefault(require("../models/Project"));
const Floor_1 = __importDefault(require("../models/Floor"));
const Model_1 = __importDefault(require("../models/Model"));
class ProjectController {
    // 项目管理
    static async getAllProjects(_req, res) {
        try {
            const projects = await Project_1.default.findAll();
            return res.status(200).json(projects);
        }
        catch (error) {
            console.error('获取项目列表失败:', error);
            return res.status(500).json({ message: '获取项目列表失败', error: String(error) });
        }
    }
    static async getProjectById(req, res) {
        try {
            const { id } = req.params;
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: '项目不存在' });
            }
            // 获取项目关联的楼层
            const floors = await Floor_1.default.findByProjectId(id);
            // 获取每个楼层关联的模型
            for (const floor of floors) {
                const models = await Model_1.default.findByFloorId(floor.id);
                floor.models = models;
            }
            return res.status(200).json({ ...project, floors });
        }
        catch (error) {
            console.error('获取项目详情失败:', error);
            return res.status(500).json({ message: '获取项目详情失败', error: String(error) });
        }
    }
    static async createProject(req, res) {
        try {
            const { name, description, location, startDate, endDate, status } = req.body;
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ message: '未授权' });
            }
            const project = await Project_1.default.create({
                name,
                description,
                location,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status,
                createdBy: userId
            });
            return res.status(201).json({ message: '项目创建成功', data: project });
        }
        catch (error) {
            console.error('创建项目失败:', error);
            return res.status(500).json({ message: '创建项目失败', error: String(error) });
        }
    }
    static async updateProject(req, res) {
        try {
            const { id } = req.params;
            const { name, description, location, startDate, endDate, status } = req.body;
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: '项目不存在' });
            }
            const updateData = {
                name,
                description,
                location,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status
            };
            const updatedProject = await Project_1.default.update(id, updateData);
            return res.status(200).json({ message: '项目更新成功', data: updatedProject });
        }
        catch (error) {
            console.error('更新项目失败:', error);
            return res.status(500).json({ message: '更新项目失败', error: String(error) });
        }
    }
    static async deleteProject(req, res) {
        try {
            const { id } = req.params;
            const project = await Project_1.default.findById(id);
            if (!project) {
                return res.status(404).json({ message: '项目不存在' });
            }
            // 删除项目相关的楼层
            await Floor_1.default.deleteByProjectId(id);
            // 删除项目
            await Project_1.default.delete(id);
            return res.status(200).json({ message: '项目删除成功' });
        }
        catch (error) {
            console.error('删除项目失败:', error);
            return res.status(500).json({ message: '删除项目失败', error: String(error) });
        }
    }
    // 楼层管理
    static async getFloors(req, res) {
        try {
            const { projectId } = req.params;
            const floors = await Floor_1.default.findByProjectId(projectId);
            return res.status(200).json(floors);
        }
        catch (error) {
            console.error('获取楼层列表失败:', error);
            return res.status(500).json({ message: '获取楼层列表失败', error: String(error) });
        }
    }
    static async getFloorById(req, res) {
        try {
            const { floorId } = req.params;
            const floor = await Floor_1.default.findById(floorId);
            if (!floor) {
                return res.status(404).json({ message: '楼层不存在' });
            }
            // 获取楼层关联的模型
            const models = await Model_1.default.findByFloorId(floorId);
            return res.status(200).json({ ...floor, models });
        }
        catch (error) {
            console.error('获取楼层详情失败:', error);
            return res.status(500).json({ message: '获取楼层详情失败', error: String(error) });
        }
    }
    static async createFloor(req, res) {
        try {
            const { projectId } = req.params;
            const { name, level, height, description } = req.body;
            // 验证项目是否存在
            const project = await Project_1.default.findById(projectId);
            if (!project) {
                return res.status(404).json({ message: '项目不存在' });
            }
            const floor = await Floor_1.default.create({
                projectId,
                name,
                level,
                height,
                description
            });
            return res.status(201).json({ message: '楼层创建成功', data: floor });
        }
        catch (error) {
            console.error('创建楼层失败:', error);
            return res.status(500).json({ message: '创建楼层失败', error: String(error) });
        }
    }
    static async updateFloor(req, res) {
        try {
            const { floorId } = req.params;
            const { name, level, height, description } = req.body;
            const floor = await Floor_1.default.findById(floorId);
            if (!floor) {
                return res.status(404).json({ message: '楼层不存在' });
            }
            const updateData = {
                name,
                level,
                height,
                description
            };
            const updatedFloor = await Floor_1.default.update(floorId, updateData);
            return res.status(200).json({ message: '楼层更新成功', data: updatedFloor });
        }
        catch (error) {
            console.error('更新楼层失败:', error);
            return res.status(500).json({ message: '更新楼层失败', error: String(error) });
        }
    }
    static async deleteFloor(req, res) {
        try {
            const { floorId } = req.params;
            const floor = await Floor_1.default.findById(floorId);
            if (!floor) {
                return res.status(404).json({ message: '楼层不存在' });
            }
            // 删除楼层相关的模型
            await Model_1.default.deleteByFloorId(floorId);
            // 删除楼层
            await Floor_1.default.delete(floorId);
            return res.status(200).json({ message: '楼层删除成功' });
        }
        catch (error) {
            console.error('删除楼层失败:', error);
            return res.status(500).json({ message: '删除楼层失败', error: String(error) });
        }
    }
}
exports.default = ProjectController;
