import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getDB } from '../config/mongodb';
import Model from '../models/Model';
import { uploadFileToMinIO, downloadFileFromMinIO, deleteFileFromMinIO } from '../utils/fileUploadService';
import { MINIO_BUCKETS } from '../config/minio';
// 模型轻量化处理工具的导入已移除，因为现在使用MinIO存储

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

      // 上传文件到MinIO
      const { url: fileUrl, objectName } = await uploadFileToMinIO(
        MINIO_BUCKETS.MODELS,
        file
      );

      // 保存原始文件名到MongoDB
      const db = getDB();
      let fileRecord = null;
      if (db) {
        fileRecord = await (db as any).collection('modelFiles').insertOne({
          modelId: '', // 稍后更新
          originalFilename: file.originalname,
          objectName,
          bucketName: MINIO_BUCKETS.MODELS,
          createdAt: new Date()
        });
      }

      // 保存模型元数据到MongoDB
      const model = await Model.create({
        projectId,
        floorId,
        name: name || file.originalname,
        type: type as 'bim' | 'cad' | '2d' | '3d',
        fileUrl,
        fileSize: file.size,
        format: path.extname(file.originalname).toLowerCase().substring(1),
        version: version || '1.0',
        uploadedBy: userId,
        description
      });

      // 更新文件记录的modelId
      if (db && fileRecord) {
        await (db as any).collection('modelFiles').updateOne(
          { _id: fileRecord.insertedId },
          { $set: { modelId: model.id } }
        );
      }

      return res.status(201).json({ message: '模型上传成功', data: model });
    } catch (error) {
      console.error('上传模型失败:', error);
      return res.status(500).json({ message: '上传模型失败', error: String(error) });
    }
  }

  // 模型轻量化处理
  static async processLightweightModel(originalFilePath: string, originalFilename: string): Promise<string> {
    const fileExtension = path.extname(originalFilename).toLowerCase();
    const baseName = path.basename(originalFilename, fileExtension);
    const lightweightFilename = `${baseName}_light${fileExtension}`;
    const lightweightPath = path.join(__dirname, '../../uploads/models', lightweightFilename);

    try {
      // 根据文件类型选择不同的轻量化处理方式
      if (fileExtension === '.dwg' || fileExtension === '.dxf') {
        // 对于DWG/DXF文件，使用CAD文件处理工具进行轻量化
        console.log('开始DWG/DXF文件轻量化处理...');
        
        // 提取CAD文件信息
        const cadInfo = await this.extractCADFileInfo();
        console.log('CAD文件信息:', cadInfo);
        
        // 模拟轻量化处理
        await this.simulateCADLightweightProcess(originalFilePath, lightweightPath, cadInfo);
      } else if (fileExtension === '.ifc' || fileExtension === '.rvt' || fileExtension === '.nwd') {
        // 对于BIM模型文件，使用专门的BIM轻量化工具
        console.log('开始BIM模型轻量化处理...');
        
        // 提取BIM模型信息
        const bimInfo = await this.extractBIMModelInfo();
        console.log('BIM模型信息:', bimInfo);
        
        // 模拟轻量化处理
        await this.simulateBIMLightweightProcess(originalFilePath, lightweightPath, bimInfo);
      } else {
        // 对于其他文件类型，直接复制作为轻量化版本
        fs.copyFileSync(originalFilePath, lightweightPath);
        console.log(`不支持的文件类型，直接复制原始文件作为轻量化版本: ${fileExtension}`);
      }

      return lightweightPath;
    } catch (error) {
      console.error('模型轻量化处理失败:', error);
      // 如果轻量化处理失败，返回原始文件路径
      return originalFilePath;
    }
  }

  // 提取CAD文件信息
  static async extractCADFileInfo(): Promise<object> {
    // 模拟提取CAD文件信息
    // 实际项目中应使用专业的CAD文件处理库
    return {
      format: 'CAD',
      version: 'AutoCAD 2023',
      layers: Math.floor(Math.random() * 50) + 10, // 10-60个图层
      entities: Math.floor(Math.random() * 500) + 100, // 100-600个实体
      units: 'mm',
      author: 'CAD Designer',
      createdDate: new Date().toISOString()
    };
  }

  // 提取BIM模型信息
  static async extractBIMModelInfo(): Promise<object> {
    // 模拟提取BIM模型信息
    // 实际项目中应使用专业的BIM文件处理库
    return {
      format: 'BIM',
      schemaVersion: 'IFC4',
      buildingElements: Math.floor(Math.random() * 1000) + 500, // 500-1500个建筑元素
      levels: Math.floor(Math.random() * 20) + 5, // 5-25个楼层
      materials: Math.floor(Math.random() * 100) + 20, // 20-120种材料
      projectName: 'Sample Building Project',
      author: 'BIM Modeler',
      createdDate: new Date().toISOString()
    };
  }

  // 模拟CAD文件轻量化处理
  static async simulateCADLightweightProcess(originalPath: string, outputPath: string, cadInfo: object): Promise<void> {
    return new Promise((resolve, reject) => {
      // 模拟轻量化处理耗时
      setTimeout(() => {
        try {
          // 复制文件作为模拟
          fs.copyFileSync(originalPath, outputPath);
          
          // 模拟生成轻量化报告
          const lightweightReport = {
            originalSize: fs.statSync(originalPath).size,
            lightweightSize: Math.floor(fs.statSync(originalPath).size * 0.6), // 模拟减少40%的文件大小
            processedTime: '2.5 seconds',
            compressionRatio: '60%',
            retainedLayers: Math.floor((cadInfo as any).layers * 0.8), // 保留80%的图层
            retainedEntities: Math.floor((cadInfo as any).entities * 0.7), // 保留70%的实体
            status: 'success'
          };
          
          console.log('CAD文件轻量化处理完成:', lightweightReport);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 2000);
    });
  }

  // 模拟BIM模型轻量化处理
  static async simulateBIMLightweightProcess(originalPath: string, outputPath: string, bimInfo: object): Promise<void> {
    return new Promise((resolve, reject) => {
      // 模拟轻量化处理耗时
      setTimeout(() => {
        try {
          // 复制文件作为模拟
          fs.copyFileSync(originalPath, outputPath);
          
          // 模拟生成轻量化报告
          const lightweightReport = {
            originalSize: fs.statSync(originalPath).size,
            lightweightSize: Math.floor(fs.statSync(originalPath).size * 0.5), // 模拟减少50%的文件大小
            processedTime: '4.2 seconds',
            compressionRatio: '50%',
            retainedElements: Math.floor((bimInfo as any).buildingElements * 0.85), // 保留85%的建筑元素
            retainedLevels: (bimInfo as any).levels, // 保留所有楼层
            status: 'success'
          };
          
          console.log('BIM模型轻量化处理完成:', lightweightReport);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 3000);
    });
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

      // 删除MongoDB中的文件记录
      const db = getDB();
      if (db) {
        const fileRecord = await (db as any).collection('modelFiles').findOne({ modelId: id });
        if (fileRecord) {
          // 从MinIO删除文件
          await deleteFileFromMinIO(fileRecord.bucketName, fileRecord.objectName);
          // 删除文件记录
          await (db as any).collection('modelFiles').deleteOne({ modelId: id });
        }
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

      // 获取文件记录
      const db = getDB();
      if (!db) {
        return res.status(500).json({ message: '数据库连接失败' });
      }

      const fileRecord = await (db as any).collection('modelFiles').findOne({ modelId: id });
      if (!fileRecord) {
        return res.status(404).json({ message: '文件记录不存在' });
      }

      // 从MinIO下载文件
      const fileBuffer = await downloadFileFromMinIO(fileRecord.bucketName, fileRecord.objectName);

      // 设置响应头并下载文件
      res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalFilename.replace(/"/g, '\\"')}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', fileBuffer.length);
      return res.send(fileBuffer);
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

      // 从MinIO下载缩略图
      const db = getDB();
      if (!db) {
        return res.status(500).json({ message: '数据库连接失败' });
      }

      // 查找缩略图文件记录
      const fileRecord = await (db as any).collection('modelFiles').findOne({ modelId: id });
      if (!fileRecord) {
        return res.status(404).json({ message: '缩略图文件记录不存在' });
      }

      // 从MinIO下载文件
      const fileBuffer = await downloadFileFromMinIO(fileRecord.bucketName, fileRecord.objectName);

      // 设置响应头并返回文件
      res.setHeader('Content-Type', 'image/png'); // 假设缩略图是PNG格式
      res.setHeader('Content-Length', fileBuffer.length);
      return res.send(fileBuffer);
    } catch (error) {
      console.error('获取缩略图失败:', error);
      return res.status(500).json({ message: '获取缩略图失败', error: String(error) });
    }
  }
}

export default ModelController;