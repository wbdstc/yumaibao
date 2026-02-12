import { Request, Response } from 'express';
import EmbeddedPart, { EmbeddedPartCreationAttributes } from '../models/EmbeddedPart';
import Floor from '../models/Floor';
import { v4 as uuidv4 } from 'uuid';
import qrcode from 'qrcode';
import xlsx from 'xlsx';

import path from 'path';
import { getDB } from '../config/mongodb';
import { uploadFileToMinIO, deleteFileFromMinIO, downloadFileFromMinIO } from '../utils/fileUploadService';
import { MINIO_BUCKETS } from '../config/minio';

class EmbeddedPartController {
  // 获取所有预埋件
  static async getAllEmbeddedParts(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      // 构建查询条件
      const whereClause: any = {};
      if (search) {
        whereClause.name = { $regex: search, $options: 'i' };
      }

      const db = getDB();
      if (!db) {
        return res.status(500).json({ message: '数据库连接失败' });
      }

      // 执行查询 - 使用与模型一致的集合名称
      const collection = db.collection('embedded_parts');
      const [rows, total] = await Promise.all([
        collection.find(whereClause).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
        collection.countDocuments(whereClause)
      ]);

      return res.status(200).json({
        total,
        pages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        data: rows
      });
    } catch (error) {
      console.error('获取预埋件列表失败:', error);
      return res.status(500).json({ message: '获取预埋件列表失败', error: String(error) });
    }
  }

  // 根据ID获取预埋件
  static async getEmbeddedPartById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const embeddedPart = await EmbeddedPart.findById(id);

      if (!embeddedPart) {
        return res.status(404).json({ message: '预埋件不存在' });
      }

      return res.status(200).json(embeddedPart);
    } catch (error) {
      console.error('获取预埋件详情失败:', error);
      return res.status(500).json({ message: '获取预埋件详情失败', error: String(error) });
    }
  }

  // 创建单个预埋件
  static async createEmbeddedPart(req: Request, res: Response) {
    try {
      const { projectId, name, type, modelNumber, description, location, coordinates } = req.body;

      // 生成预埋件唯一ID
      const partId = uuidv4();
      // 获取前端URL（用于生成可扫描跳转的二维码链接）
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      // 生成二维码数据 - 使用完整URL，扫码后可直接跳转到BIM可视化页面
      const qrCodeData = `${frontendUrl}/bim?partId=${partId}`;

      // 生成二维码图片到内存
      const qrCodeBuffer = await qrcode.toBuffer(qrCodeData);
      const qrCodeFileName = `${partId}.png`;

      // 上传到MinIO
      const { url: qrCodeUrl, objectName } = await uploadFileToMinIO(
        MINIO_BUCKETS.QRCODES,
        {
          buffer: qrCodeBuffer,
          originalname: qrCodeFileName,
          mimetype: 'image/png',
          size: qrCodeBuffer.length,
          fieldname: 'qrcode',
          encoding: '7bit',
          stream: null as any,
          destination: '',
          filename: qrCodeFileName,
          path: ''
        }
      );

      const embeddedPart = await EmbeddedPart.create({
        id: partId,
        projectId,
        name,
        type,
        modelNumber,
        description,
        location,
        coordinates,
        qrCodeData,
        qrCodeUrl,
        status: 'pending'
      });

      // 保存文件记录到modelFiles集合
      const db = getDB();
      if (db) {
        await db.collection('modelFiles').insertOne({
          modelId: partId,
          originalFilename: qrCodeFileName,
          objectName,
          bucketName: MINIO_BUCKETS.QRCODES,
          createdAt: new Date()
        });
      }

      return res.status(201).json({ message: '预埋件创建成功', data: embeddedPart });
    } catch (error) {
      console.error('创建预埋件失败:', error);
      return res.status(500).json({ message: '创建预埋件失败', error: String(error) });
    }
  }

  // 批量创建预埋件
  static async batchCreateEmbeddedParts(req: Request, res: Response) {
    try {
      const parts = req.body;
      const createdParts = [];

      // 获取项目ID（假设同一批次属于同一个项目，取第一个有项目的作为参考，或者从请求中获取如果设计如此）
      // 这里假设parts数组中至少有一个元素且包含projectId，或者每个元素都有projectId
      if (parts.length === 0) {
        return res.status(400).json({ message: '没有数据可导入' });
      }

      const projectId = parts[0].projectId;

      // 获取该项目的所有楼层
      let floorMap = new Map<string, string>(); // name -> id
      if (projectId) {
        const floors = await Floor.findByProjectId(projectId);
        floors.forEach(f => {
          if (f.name) {
            floorMap.set(f.name, f.id);
          }
        });
      }

      for (const part of parts) {
        const {
          projectId,
          name,
          type,
          modelNumber,
          description,
          location,
          coordinates,
          code,
          floorId,
          floorName,
          notes,
          coordinates2D,
          status,           // 新增：允许传入状态
          statusHistory,    // 新增：允许传入历史记录
          installationDate, // 新增
          inspectionDate,   // 新增
          inspectorId       // 新增
        } = part;

        // 解析 floorId
        let finalFloorId = floorId;
        if (!finalFloorId && floorName) {
          // 如果只有 floorName，尝试查找对应的 ID
          finalFloorId = floorMap.get(floorName);
          if (!finalFloorId) {
            console.warn(`未找到楼层: ${floorName} (Project: ${projectId})`);
          }
        }

        // 生成预埋件唯一ID
        const partId = uuidv4();
        // 获取前端URL（用于生成可扫描跳转的二维码链接）
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        // 生成二维码数据 - 使用完整URL，扫码后可直接跳转到BIM可视化页面
        const qrCodeData = `${frontendUrl}/bim?partId=${partId}`;

        // 生成二维码图片到内存
        const qrCodeBuffer = await qrcode.toBuffer(qrCodeData);
        const qrCodeFileName = `${partId}.png`;

        // 上传到MinIO
        const { url: qrCodeUrl, objectName } = await uploadFileToMinIO(
          MINIO_BUCKETS.QRCODES,
          {
            buffer: qrCodeBuffer,
            originalname: qrCodeFileName,
            mimetype: 'image/png',
            size: qrCodeBuffer.length,
            fieldname: 'qrcode',
            encoding: '7bit',
            stream: null as any,
            destination: '',
            filename: qrCodeFileName,
            path: ''
          }
        );

        const embeddedPart = await EmbeddedPart.create({
          id: partId,
          projectId,
          name,
          type,
          modelNumber,
          description: description || notes,
          location,
          coordinates,
          code,
          floorId: finalFloorId,
          notes,
          coordinates2D,
          qrCodeData,
          qrCodeUrl,
          status: status || 'pending', // 使用传入的状态，默认为 pending
          ...(statusHistory && { statusHistory }), // 如果有历史记录则传入
          ...(installationDate && { installationDate }),
          ...(inspectionDate && { inspectionDate }),
          ...(inspectorId && { inspectorId })
        });

        // 保存文件记录到modelFiles集合
        const db = getDB();
        if (db) {
          await db.collection('modelFiles').insertOne({
            modelId: embeddedPart.id,
            originalFilename: qrCodeFileName,
            objectName,
            bucketName: MINIO_BUCKETS.QRCODES,
            createdAt: new Date()
          });
        }

        createdParts.push(embeddedPart);
      }

      return res.status(201).json({ message: '预埋件批量创建成功', data: createdParts });
    } catch (error) {
      console.error('批量创建预埋件失败:', error);
      return res.status(500).json({ message: '批量创建预埋件失败', error: String(error) });
    }
  }

  // 从Excel导入预埋件
  static async importEmbeddedParts(req: Request, res: Response) {
    try {
      const file = req.file;
      const { projectId } = req.body;

      if (!file) {
        return res.status(400).json({ message: '未上传文件' });
      }

      if (!projectId) {
        return res.status(400).json({ message: '项目ID不能为空' });
      }

      // 定义Excel行数据的类型
      interface ExcelRow {
        name?: string;
        code?: string;
        type?: string;
        modelNumber?: string;
        location?: string;
        floorId?: string;
        floorName?: string;
        coordinates?: string | Record<string, any>;
        coordinates2D?: string | Record<string, any>;
        description?: string;
        notes?: string;
        [key: string]: any;
      }

      // 读取Excel文件
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: ExcelRow[] = xlsx.utils.sheet_to_json(worksheet);

      const importedParts: any[] = [];
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // 验证必填字段
          // 验证必填字段 - 让coordinates可选，因为可能只提供坐标XYZ或2D坐标
          if (!row.name || !row.type || !row.modelNumber || !row.location) {
            errors.push({ row: i + 2, message: '缺少必填字段' });
            continue;
          }

          // 解析坐标 (coordinates)
          let coordinates = row.coordinates;
          if (typeof row.coordinates === 'string') {
            try {
              coordinates = JSON.parse(row.coordinates);
            } catch (e) {
              coordinates = undefined;
            }
          }

          // 解析2D坐标 (coordinates2D)
          let coordinates2D = row.coordinates2D;
          if (typeof row.coordinates2D === 'string') {
            try {
              coordinates2D = JSON.parse(row.coordinates2D);
            } catch (e) {
              coordinates2D = undefined;
            }
          }

          // 生成预埋件唯一ID
          const partId = uuidv4();
          // 获取前端URL（用于生成可扫描跳转的二维码链接）
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          // 生成二维码数据 - 使用完整URL，扫码后可直接跳转到BIM可视化页面
          const qrCodeData = `${frontendUrl}/bim?partId=${partId}`;

          // 生成二维码图片到内存
          const qrCodeBuffer = await qrcode.toBuffer(qrCodeData);
          const qrCodeFileName = `${partId}.png`;

          // 上传到MinIO
          const { url: qrCodeUrl, objectName } = await uploadFileToMinIO(
            MINIO_BUCKETS.QRCODES,
            {
              buffer: qrCodeBuffer,
              originalname: qrCodeFileName,
              mimetype: 'image/png',
              size: qrCodeBuffer.length,
              fieldname: 'qrcode',
              encoding: '7bit',
              stream: null as any,
              destination: '',
              filename: qrCodeFileName,
              path: ''
            }
          );

          const embeddedPart = await EmbeddedPart.create({
            id: partId,
            projectId,
            name: row.name,
            code: row.code,
            type: row.type,
            modelNumber: row.modelNumber,
            description: row.description || row.notes || '',
            location: row.location,
            floorId: row.floorId, // 注意：importEmbeddedParts 主要是解析 Excel 并直接插入，如果需要支持 Excel 里的 floorName 转 floorId，
            // 最好是复用 batchCreateEmbeddedParts 或者在这里添加类似的查找逻辑。
            // 鉴于 handleExcelUpload 前端是解析 Excel 后调用 batchCreateEmbeddedParts，
            // 这个 importEmbeddedParts 方法可能用于旧的直接文件上传接口。
            // 为了保持一致性，建议也加上查找逻辑，但目前需求主要是前端 Excel 解析上传。
            // 暂时保持原样，或者如果用户确实用这个接口，也需要改。
            // 观察前端代码，使用的是 batchCreateEmbeddedParts (POST JSON)，而不是 importEmbeddedParts (POST FILE)。
            // 所以这里可以暂时不改，或者稍后优化。
            coordinates,
            coordinates2D,
            notes: row.notes || row.description || '',
            qrCodeData,
            qrCodeUrl
          });

          // 保存文件记录到modelFiles集合
          const db = getDB();
          if (db) {
            await db.collection('modelFiles').insertOne({
              modelId: embeddedPart.id,
              originalFilename: qrCodeFileName,
              objectName,
              bucketName: MINIO_BUCKETS.QRCODES,
              createdAt: new Date()
            });
          }

          importedParts.push(embeddedPart);
        } catch (err) {
          errors.push({ row: i + 2, message: String(err) });
        }
      }

      return res.status(200).json({
        message: '预埋件导入完成',
        importedCount: importedParts.length,
        errorCount: errors.length,
        errors,
        data: importedParts
      });
    } catch (error) {
      console.error('导入预埋件失败:', error);
      return res.status(500).json({ message: '导入预埋件失败', error: String(error) });
    }
  }

  // 更新预埋件信息
  static async updateEmbeddedPart(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const embeddedPart = await EmbeddedPart.findById(id);
      if (!embeddedPart) {
        return res.status(404).json({ message: '预埋件不存在' });
      }

      // MongoDB可以直接存储对象，不需要转换为JSON字符串

      updateData.updatedAt = new Date();
      const updatedPart = await EmbeddedPart.update(id, updateData);
      return res.status(200).json({ message: '预埋件更新成功', data: updatedPart });
    } catch (error) {
      console.error('更新预埋件失败:', error);
      return res.status(500).json({ message: '更新预埋件失败', error: String(error) });
    }
  }

  // 批量更新状态
  static async batchUpdateStatus(req: Request, res: Response) {
    try {
      const { ids, status, notes } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ message: '未授权' });
      }

      // 更新状态
      const updateData: Partial<EmbeddedPartCreationAttributes> = {
        status: status as 'pending' | 'installed' | 'inspected' | 'rejected'
      };

      if (status === 'installed') {
        updateData.installationDate = new Date();
      } else if (status === 'inspected' || status === 'rejected') {
        updateData.inspectorId = userId;
        updateData.inspectionDate = new Date();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const result = await EmbeddedPart.batchUpdate(ids, updateData);

      return res.status(200).json({ message: `成功更新 ${result} 个预埋件状态` });
    } catch (error) {
      console.error('批量更新预埋件状态失败:', error);
      return res.status(500).json({ message: '批量更新预埋件状态失败', error: String(error) });
    }
  }

  // 删除预埋件
  static async deleteEmbeddedPart(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const embeddedPart = await EmbeddedPart.findById(id);
      if (!embeddedPart) {
        return res.status(404).json({ message: '预埋件不存在' });
      }

      // 从MinIO删除二维码图片 - 这里我们假设qrCodeUrl包含了足够的信息来构建objectName
      // 注意：实际实现可能需要从数据库中查询文件记录以获取完整的objectName
      // 由于我们的架构设计中，文件记录应该存储在modelFiles集合中，所以需要查询该集合
      const db = getDB();
      if (db) {
        // 查询二维码文件记录
        const fileRecord = await (db as any).collection('modelFiles').findOne({
          $or: [
            { originalFilename: path.basename(embeddedPart.qrCodeUrl) },
            { url: embeddedPart.qrCodeUrl }
          ]
        });
        if (fileRecord) {
          // 从MinIO删除文件
          await deleteFileFromMinIO(fileRecord.bucketName, fileRecord.objectName);
          // 删除文件记录
          await (db as any).collection('modelFiles').deleteOne({ _id: fileRecord._id });
        }
      }

      await EmbeddedPart.delete(id);
      return res.status(200).json({ message: '预埋件删除成功' });
    } catch (error) {
      console.error('删除预埋件失败:', error);
      return res.status(500).json({ message: '删除预埋件失败', error: String(error) });
    }
  }

  // 批量删除预埋件
  static async batchDeleteEmbeddedParts(req: Request, res: Response) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: '请提供要删除的预埋件ID列表' });
      }

      // 1. 获取要删除的预埋件信息，以便删除关联的MinIO文件
      const db = getDB();
      if (db) {
        const collection = db.collection('embedded_parts');
        const partsToDelete = await collection.find({ id: { $in: ids } }).toArray();

        // 收集所有关联的二维码图片URL或文件名
        const qrCodeFiles = partsToDelete
          .filter((part: any) => part.qrCodeUrl)
          .map((part: any) => {
            // 提取文件名或URL
            return part.qrCodeUrl;
          });

        if (qrCodeFiles.length > 0) {
          // 查找文件记录
          const fileRecords = await (db as any).collection('modelFiles').find({
            $or: [
              { originalFilename: { $in: qrCodeFiles.map((url: string) => path.basename(url)) } },
              { url: { $in: qrCodeFiles } }
            ]
          }).toArray();

          // 批量删除MinIO文件
          for (const record of fileRecords) {
            try {
              await deleteFileFromMinIO(record.bucketName, record.objectName);
            } catch (err) {
              console.error(`删除MinIO文件失败: ${record.objectName}`, err);
              // 继续删除其他文件，不中断流程
            }
          }

          // 删除文件记录
          if (fileRecords.length > 0) {
            await (db as any).collection('modelFiles').deleteMany({
              _id: { $in: fileRecords.map((r: any) => r._id) }
            });
          }
        }
      }

      // 2. 批量删除数据库记录
      const deleteCount = await EmbeddedPart.batchDelete(ids);

      return res.status(200).json({
        message: '预埋件批量删除成功',
        count: deleteCount
      });
    } catch (error) {
      console.error('批量删除预埋件失败:', error);
      return res.status(500).json({ message: '批量删除预埋件失败', error: String(error) });
    }
  }

  // 按项目获取预埋件
  static async getEmbeddedPartsByProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { floorId } = req.query; // 从查询参数中获取楼层ID

      const query: any = { projectId };

      // 如果提供了楼层ID，添加到查询条件中
      if (floorId) {
        query.floorId = floorId;
      }

      // 使用findAll方法支持更灵活的查询
      const embeddedParts = await EmbeddedPart.findAll(query);
      return res.status(200).json(embeddedParts);
    } catch (error) {
      console.error('按项目获取预埋件失败:', error);
      return res.status(500).json({ message: '按项目获取预埋件失败', error: String(error) });
    }
  }

  // 按楼层获取预埋件
  static async getEmbeddedPartsByFloor(req: Request, res: Response) {
    try {
      const { projectId, floorId } = req.params;
      const embeddedParts = await EmbeddedPart.findAll({
        projectId,
        location: { $regex: floorId, $options: 'i' }
      });
      return res.status(200).json(embeddedParts);
    } catch (error) {
      console.error('按楼层获取预埋件失败:', error);
      return res.status(500).json({ message: '按楼层获取预埋件失败', error: String(error) });
    }
  }

  // 获取二维码
  static async generateQRCode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const embeddedPart = await EmbeddedPart.findById(id);

      if (!embeddedPart || !embeddedPart.qrCodeUrl) {
        return res.status(404).json({ message: '预埋件或二维码不存在' });
      }

      // 从MinIO获取二维码图片
      const db = getDB();
      if (!db) {
        return res.status(500).json({ message: '数据库连接失败' });
      }

      // 查找二维码文件记录
      let fileRecord = await (db as any).collection('modelFiles').findOne({
        $or: [
          { modelId: id },
          { originalFilename: path.basename(embeddedPart.qrCodeUrl) },
          { url: embeddedPart.qrCodeUrl }
        ]
      });

      // 如果记录不存在，由于这是一个自愈逻辑，我们在这里重新生成并保存记录
      if (!fileRecord) {
        console.log(`正在为预埋件 ${id} 重新生成缺失的二维码记录...`);
        try {
          // 重新生成二维码图片到内存
          const qrCodeBuffer = await qrcode.toBuffer(embeddedPart.qrCodeData);
          const qrCodeFileName = `${embeddedPart.qrCodeData}.png`;

          // 重新上传到MinIO
          const { url: qrCodeUrl, objectName } = await uploadFileToMinIO(
            MINIO_BUCKETS.QRCODES,
            {
              buffer: qrCodeBuffer,
              originalname: qrCodeFileName,
              mimetype: 'image/png',
              size: qrCodeBuffer.length,
              fieldname: 'qrcode',
              encoding: '7bit',
              stream: null as any,
              destination: '',
              filename: qrCodeFileName,
              path: ''
            }
          );

          // 更新预埋件的URL（以防万一URL发生了变化）
          await EmbeddedPart.update(id, { qrCodeUrl });

          // 创建缺失的文件记录
          fileRecord = {
            modelId: id,
            originalFilename: qrCodeFileName,
            objectName,
            bucketName: MINIO_BUCKETS.QRCODES,
            createdAt: new Date()
          };
          await (db as any).collection('modelFiles').insertOne(fileRecord);
          console.log(`预埋件 ${id} 的二维码记录已成功补全`);
        } catch (genError) {
          console.error('重新生成二维码失败:', genError);
          return res.status(500).json({ message: '二维码记录不存在且重新生成失败' });
        }
      }

      // 从MinIO下载文件
      const fileBuffer = await downloadFileFromMinIO(fileRecord.bucketName, fileRecord.objectName);

      // 设置响应头并返回文件 - 使用更可靠的方式发送二进制数据
      res.setHeader('Content-Type', 'image/png'); // 假设二维码是PNG格式
      res.setHeader('Content-Length', fileBuffer.length);
      res.setHeader('Content-Transfer-Encoding', 'binary');

      // 使用 write 和 end 确保二进制数据不被转换
      res.write(fileBuffer, 'binary');
      return res.end();
    } catch (error) {
      console.error('获取二维码失败:', error);
      return res.status(500).json({ message: '获取二维码失败', error: String(error) });
    }
  }

  // 确认安装
  static async confirmInstallation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ message: '未授权' });
      }

      const embeddedPart = await EmbeddedPart.findById(id);
      if (!embeddedPart) {
        return res.status(404).json({ message: '预埋件不存在' });
      }

      // 处理照片上传
      const photoUrls: string[] = [];
      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const result = await uploadFileToMinIO(MINIO_BUCKETS.UPLOADS, file, `installation/${id}/${Date.now()}-${file.originalname}`);
            photoUrls.push(result.url);
          } catch (uploadError) {
            console.error('照片上传失败:', uploadError);
          }
        }
      }

      const updateData: any = {
        status: 'installed' as 'pending' | 'installed' | 'inspected' | 'rejected',
        installationDate: new Date()
      };
      if (photoUrls.length > 0) {
        updateData.installationPhotos = photoUrls;
      }

      const updatedPart = await EmbeddedPart.update(id, updateData);
      return res.status(200).json({ message: '安装确认成功', data: updatedPart });
    } catch (error) {
      console.error('确认安装失败:', error);
      return res.status(500).json({ message: '确认安装失败', error: String(error) });
    }
  }

  // 确认验收
  static async confirmInspection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ message: '未授权' });
      }

      const embeddedPart = await EmbeddedPart.findById(id);
      if (!embeddedPart) {
        return res.status(404).json({ message: '预埋件不存在' });
      }

      // 处理照片上传
      const photoUrls: string[] = [];
      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const result = await uploadFileToMinIO(MINIO_BUCKETS.UPLOADS, file, `inspection/${id}/${Date.now()}-${file.originalname}`);
            photoUrls.push(result.url);
          } catch (uploadError) {
            console.error('照片上传失败:', uploadError);
          }
        }
      }

      const updateData: any = {
        status: status as 'pending' | 'installed' | 'inspected' | 'rejected',
        inspectorId: userId,
        inspectionDate: new Date(),
        notes
      };
      if (photoUrls.length > 0) {
        updateData.inspectionPhotos = photoUrls;
      }

      const updatedPart = await EmbeddedPart.update(id, updateData);
      return res.status(200).json({ message: '验收确认成功', data: updatedPart });
    } catch (error) {
      console.error('确认验收失败:', error);
      return res.status(500).json({ message: '确认验收失败', error: String(error) });
    }
  }

  // 更新扫码状态（通用接口）
  static async updateScanStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body; // status: 'installed' or 'inspected'
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ message: '未授权' });
      }

      const embeddedPart = await EmbeddedPart.findById(id);
      if (!embeddedPart) {
        return res.status(404).json({ message: '预埋件不存在' });
      }

      const updateData: any = {
        status: status,
      };

      if (status === 'installed') {
        updateData.installationDate = new Date();
      } else if (status === 'inspected') {
        updateData.inspectorId = userId;
        updateData.inspectionDate = new Date();
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const updatedPart = await EmbeddedPart.update(id, updateData);
      return res.status(200).json({ message: '状态更新成功', data: updatedPart });
    } catch (error) {
      console.error('状态更新失败:', error);
      return res.status(500).json({ message: '状态更新失败', error: String(error) });
    }
  }

  // 获取状态统计
  static async getStatusStats(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const db = getDB();

      if (!db) {
        return res.status(500).json({ message: '数据库连接失败' });
      }

      const stats = await db.collection('embedded_parts').aggregate([
        { $match: { projectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } }
      ]).toArray();

      // 转换为更友好的格式
      const formattedStats = stats.reduce((acc: Record<string, number>, item: any) => {
        acc[item.status] = item.count;
        return acc;
      }, {} as Record<string, number>);

      return res.status(200).json({ stats: formattedStats });
    } catch (error) {
      console.error('获取状态统计失败:', error);
      return res.status(500).json({ message: '获取状态统计失败', error: String(error) });
    }
  }
}

export default EmbeddedPartController;
