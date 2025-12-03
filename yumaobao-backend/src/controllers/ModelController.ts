import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getDB } from '../config/mongodb';
import Model from '../models/Model';

class ModelController {
  // 获取模型列表
  static async getAllModels(req: Request, res: Response) {
    try {
      const { projectId, floorId } = req.query;
      const whereClause: any = {};
      
      if (projectId) whereClause.projectId = projectId;
      if (floorId) whereClause.floorId = floorId;
      
      const models = await Model.findAll(whereClause);
      return res.status(200).json(models);
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return res.status(500).json({ message: '获取模型列表失败', error: String(error) });
    }
  }

  // 根据ID获取模型
  static async getModelById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const model = await Model.findById(id);

      if (!model) {
        return res.status(404).json({ message: '模型不存在' });
      }

      return res.status(200).json(model);
    } catch (error) {
      console.error('获取模型失败:', error);
      return res.status(500).json({ message: '获取模型失败', error: String(error) });
    }
  }

  // 上传模型文件
  static async uploadModel(req: Request, res: Response) {
    try {
      const { projectId, floorId, name, type, description, version } = req.body;
      const userId = (req as any).user?.userId;
      const file = req.file;

      if (!userId) {
        return res.status(401).json({ message: '未授权' });
      }

      if (!file) {
        return res.status(400).json({ message: '未上传文件' });
      }

      // 确保uploads目录存在
      const uploadDir = path.join(__dirname, '../../uploads/models');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // 保存模型元数据到MongoDB
      const model = await Model.create({
        projectId,
        floorId,
        name: name || file.originalname,
        type: type as 'bim' | 'cad' | '2d' | '3d',
        fileUrl: `/uploads/models/${file.filename}`,
        fileSize: file.size,
        format: path.extname(file.originalname).toLowerCase().substring(1),
        version: version || '1.0',
        uploadedBy: userId,
        description
      });

      // 保存原始文件名到MongoDB（可选）
      const db = getDB();
      if (db) {
        await (db as any).collection('modelFiles').insertOne({
          modelId: model.id,
          originalFilename: file.originalname,
          filename: file.filename,
          path: file.path,
          createdAt: new Date()
        });
      }

      return res.status(201).json({ message: '模型上传成功', data: model });
    } catch (error) {
      console.error('上传模型失败:', error);
      return res.status(500).json({ message: '上传模型失败', error: String(error) });
    }
  }

  // 更新模型信息
  static async updateModel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, floorId, description, metadata } = req.body;

      const model = await Model.findById(id);
      if (!model) {
        return res.status(404).json({ message: '模型不存在' });
      }

      const updateData = {
        name,
        floorId,
        description,
        metadata
      };

      const updatedModel = await Model.update(id, updateData);
      return res.status(200).json({ message: '模型更新成功', data: updatedModel });
    } catch (error) {
      console.error('更新模型失败:', error);
      return res.status(500).json({ message: '更新模型失败', error: String(error) });
    }
  }

  // 删除模型
  static async deleteModel(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const model = await Model.findById(id);
      if (!model) {
        return res.status(404).json({ message: '模型不存在' });
      }

      // 删除文件
      const filePath = path.join(__dirname, '../../uploads/models', path.basename(model.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // 删除MongoDB中的文件记录（可选）
      const db = getDB();
      if (db) {
        await (db as any).collection('modelFiles').deleteOne({ modelId: id });
      }

      // 删除MongoDB中的模型记录
      await Model.delete(id);

      return res.status(200).json({ message: '模型删除成功' });
    } catch (error) {
      console.error('删除模型失败:', error);
      return res.status(500).json({ message: '删除模型失败', error: String(error) });
    }
  }

  // 根据项目获取模型
  static async getModelsByProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const models = await Model.findByProjectId(projectId);
      return res.status(200).json(models);
    } catch (error) {
      console.error('根据项目获取模型失败:', error);
      return res.status(500).json({ message: '根据项目获取模型失败', error: String(error) });
    }
  }

  // 下载模型文件
  static async downloadModel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const model = await Model.findById(id);

      if (!model) {
        return res.status(404).json({ message: '模型不存在' });
      }

      const filePath = path.join(__dirname, '../../uploads/models', path.basename(model.fileUrl));
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: '文件不存在' });
      }

      // 获取原始文件名（可选，从MongoDB获取）
      const db = getDB();
      let originalFilename = path.basename(model.fileUrl);
      if (db) {
        const fileRecord = await (db as any).collection('modelFiles').findOne({ modelId: id });
        originalFilename = fileRecord?.originalFilename || originalFilename;
      }

      // 设置响应头并下载文件
      res.setHeader('Content-Disposition', `attachment; filename="${originalFilename.replace(/"/g, '\\"')}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.sendFile(filePath);
    } catch (error) {
      console.error('下载模型失败:', error);
      return res.status(500).json({ message: '下载模型失败', error: String(error) });
    }
  }

  // 获取缩略图
  static async getThumbnail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const model = await Model.findById(id);

      if (!model || !model.thumbnailUrl) {
        return res.status(404).json({ message: '缩略图不存在' });
      }

      const thumbnailPath = path.join(__dirname, '../../uploads/models', path.basename(model.thumbnailUrl));

      if (!fs.existsSync(thumbnailPath)) {
        return res.status(404).json({ message: '缩略图文件不存在' });
      }

      return res.sendFile(thumbnailPath);
    } catch (error) {
      console.error('获取缩略图失败:', error);
      return res.status(500).json({ message: '获取缩略图失败', error: String(error) });
    }
  }
}

export default ModelController;