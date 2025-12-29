import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { uploadFileToMinIO } from './fileUploadService';
import { MINIO_BUCKETS } from '../config/minio';

// IFC转换参数类型
export interface IFCConversionParams {
  inputFile: string;
  outputFormat: 'gltf' | 'glb' | 'obj';
  isLightweight?: boolean;
  quality?: number; // 0-100
  includeMaterials?: boolean;
  includeTextures?: boolean;
  timeout?: number; // 转换超时时间（毫秒）
}

// IFC转换状态类型
export interface IFCConversionStatus {
  status: 'pending' | 'running' | 'success' | 'error' | 'timeout';
  progress: number; // 0-100
  message: string;
  startTime?: number;
  endTime?: number;
  conversionTime?: number;
}

// 转换状态回调函数类型
export type ConversionProgressCallback = (status: IFCConversionStatus) => void;

// IFC转换结果类型
export interface IFCConversionResult {
  success: boolean;
  outputFile?: string;
  outputUrl?: string;
  objectName?: string;
  message?: string;
  conversionTime?: number;
  originalSize?: number;
  convertedSize?: number;
}

class IFCConversionService {
  private ifcOpenShellPath: string;

  constructor() {
    // 从环境变量获取IfcOpenShell路径，默认值为C:\Program Files\IfcOpenShell
    this.ifcOpenShellPath = process.env.IFC_OPEN_SHELL_PATH || 'C:\\Program Files\\IfcOpenShell';
  }

  // 检查IfcOpenShell是否可用
  public isIfcOpenShellAvailable(): boolean {
    try {
      // 检查IfcConvert可执行文件是否存在
      const ifcConvertPath = this.getIfcConvertPath();
      return fs.existsSync(ifcConvertPath);
    } catch (error) {
      console.error('检查IfcOpenShell可用性失败:', error);
      return false;
    }
  }

  // 获取IfcConvert可执行文件路径
  private getIfcConvertPath(): string {
    // 根据操作系统确定可执行文件扩展名
    const ext = process.platform === 'win32' ? '.exe' : '';
    // 直接在IfcOpenShell根目录下查找IfcConvert.exe，而不是在bin子目录中查找
    return path.join(this.ifcOpenShellPath, `IfcConvert${ext}`);
  }

  // 执行IFC转换
  public async convertIFC(params: IFCConversionParams): Promise<IFCConversionResult> {
    const startTime = Date.now();
    const logPrefix = `[IFC转换] ${path.basename(params.inputFile)}`;
    
    try {
      console.log(`${logPrefix} 开始转换，参数:`, params);
      
      // 检查输入文件是否存在
      if (!fs.existsSync(params.inputFile)) {
        console.error(`${logPrefix} 输入文件不存在: ${params.inputFile}`);
        return {
          success: false,
          message: '输入文件不存在'
        };
      }

      // 检查IfcOpenShell是否可用
      if (!this.isIfcOpenShellAvailable()) {
        const ifcConvertPath = this.getIfcConvertPath();
        console.error(`${logPrefix} IfcOpenShell不可用，检查路径: ${ifcConvertPath}`);
        return {
          success: false,
          message: `IfcOpenShell不可用，请检查安装路径: ${ifcConvertPath}`
        };
      }

      // 创建输出文件路径
      const outputFile = this.generateOutputFilePath(params.inputFile, params.outputFormat);
      console.log(`${logPrefix} 输出文件路径: ${outputFile}`);
      
      // 获取IfcConvert路径
      const ifcConvertPath = this.getIfcConvertPath();
      
      // 构建转换命令数组，避免路径中的空格问题
      const commandArgs = [
        ifcConvertPath,
        params.inputFile,
        outputFile
      ];
      
      // 添加转换参数
      if (params.isLightweight) {
        commandArgs.push('--use-element-guids');
      }
      
      if (params.quality !== undefined) {
        commandArgs.push('--precision', params.quality.toString());
      }

      // 添加 --yes 参数，自动覆盖已存在的文件
      commandArgs.push('--yes');

      
      if (!params.includeMaterials) {
        commandArgs.push('--no-materials');
      }
      
      if (!params.includeTextures) {
        commandArgs.push('--no-textures');
      }
      
      // IfcConvert通过输出文件扩展名自动确定输出格式，不需要--format参数
      // 确保输出文件已经有正确的扩展名，这在generateOutputFilePath方法中已经处理
      
      console.log(`${logPrefix} 转换命令参数:`, commandArgs);
      
      // 执行转换命令并获取结果
      const commandResult = await new Promise<IFCConversionResult>((resolve) => {
        const { exec } = require('child_process');
        
        // 对于Windows系统，使用cmd.exe /c执行命令，确保路径中的空格被正确处理
        let commandStr: string;
        
        // 构建带引号的命令参数，确保路径被正确处理
        const quotedArgs = commandArgs.map(arg => {
          // 对于包含空格的路径，添加双引号
          return arg.includes(' ') ? `"${arg}"` : arg;
        });
        
        if (process.platform === 'win32') {
          // 使用cmd.exe /c执行命令，避免PowerShell的语法问题
          // 注意：quotedArgs中的参数已经被正确引号，不需要在外层再添加引号
          commandStr = `cmd.exe /c ${quotedArgs.join(' ')}`;
        } else {
          // 非Windows系统，直接使用命令字符串
          commandStr = quotedArgs.join(' ');
        }
        
        console.log(`${logPrefix} 转换命令字符串: ${commandStr}`);
        
        // 设置超时时间（5分钟）
        const timeout = 5 * 60 * 1000;
        
        const childProcess = exec(commandStr, {
          timeout: timeout,
          encoding: 'utf-8'
        }, (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            console.error(`${logPrefix} 转换命令执行失败:`, error);
            resolve({
              success: false,
              message: `转换命令执行失败，错误: ${error.message}，错误输出: ${stderr}，标准输出: ${stdout}`
            });
            return;
          }
          
          console.log(`${logPrefix} 转换命令退出码: 0`);
          
          // 检查转换结果
          if (!fs.existsSync(outputFile)) {
            console.error(`${logPrefix} 转换失败，未生成输出文件: ${outputFile}`);
            resolve({
              success: false,
              message: '转换失败，未生成输出文件'
            });
            return;
          }
          
          console.log(`${logPrefix} 转换命令执行成功，生成输出文件: ${outputFile}`);
          resolve({
            success: true,
            message: '转换命令执行成功'
          });
        });
        
        // 处理超时
        childProcess.on('timeout', () => {
          console.error(`${logPrefix} 转换命令执行超时，已终止`);
          childProcess.kill();
          resolve({
            success: false,
            message: '转换命令执行超时，模型文件可能过大或转换过程过于复杂'
          });
        });
        
        // 实时处理标准输出
        childProcess.stdout?.on('data', (data: Buffer) => {
          const output = data.toString();
          console.log(`${logPrefix} 标准输出: ${output}`);
        });
        
        // 实时处理标准错误
        childProcess.stderr?.on('data', (data: Buffer) => {
          const output = data.toString();
          console.error(`${logPrefix} 错误输出: ${output}`);
        });
      });
      
      // 检查命令执行结果
      if (!commandResult.success) {
        return commandResult;
      }
      console.log(`${logPrefix} 转换成功，生成输出文件: ${outputFile}`);

      // 获取文件大小
      let originalStats, convertedStats;
      try {
        originalStats = fs.statSync(params.inputFile);
        convertedStats = fs.statSync(outputFile);
        console.log(`${logPrefix} 文件大小 - 原始: ${originalStats.size}字节，转换后: ${convertedStats.size}字节`);
      } catch (statError) {
        console.error(`${logPrefix} 获取文件大小失败: ${(statError as Error).message}`);
        return {
          success: false,
          message: `获取文件大小失败: ${(statError as Error).message}`
        };
      }

      // 上传转换后的文件到MinIO，使用原始文件名（无_converted后缀）
let outputUrl, objectName;
try {
  const originalFileName = path.basename(params.inputFile, path.extname(params.inputFile));
  const convertedFileName = `${originalFileName}.${params.outputFormat}`;
  
  const uploadResult = await uploadFileToMinIO(
    MINIO_BUCKETS.MODELS,
    {
      originalname: convertedFileName,
      buffer: fs.readFileSync(outputFile),
      size: convertedStats.size,
      mimetype: this.getMimeType(params.outputFormat)
    } as Express.Multer.File
  );
  outputUrl = uploadResult.url;
  objectName = uploadResult.objectName;
  console.log(`${logPrefix} 文件上传成功，URL: ${outputUrl}`);
} catch (uploadError) {
  console.error(`${logPrefix} 文件上传失败: ${(uploadError as Error).message}`);
  return {
    success: false,
    message: `文件上传失败: ${(uploadError as Error).message}`
  };
}

      // 清理临时文件
      try {
        fs.unlinkSync(outputFile);
        console.log(`${logPrefix} 临时文件清理成功: ${outputFile}`);
      } catch (cleanupError) {
        console.error(`${logPrefix} 临时文件清理失败: ${(cleanupError as Error).message}`);
        // 清理失败不影响转换结果，继续执行
      }

      const conversionTime = Date.now() - startTime;
      console.log(`${logPrefix} 转换完成，耗时: ${conversionTime}ms`);
      
      return {
        success: true,
        outputFile,
        outputUrl,
        objectName,
        message: '转换成功',
        conversionTime,
        originalSize: originalStats.size,
        convertedSize: convertedStats.size
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error(`${logPrefix} 转换失败，未知错误: ${errorMessage}`);
      console.error(`${logPrefix} 错误堆栈:`, error);
      return {
        success: false,
        message: `转换失败: ${errorMessage}`
      };
    }
  }



  // 生成输出文件路径
private generateOutputFilePath(inputFile: string, outputFormat: string): string {
  const baseName = path.basename(inputFile, path.extname(inputFile));
  const tempDir = path.join(__dirname, '../../temp');
  
  // 确保临时目录存在
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // 直接使用原始文件名（无_converted后缀）
  return path.join(tempDir, `${baseName}.${outputFormat}`);
}

  // 获取MIME类型
  private getMimeType(format: string): string {
    switch (format) {
      case 'gltf':
        return 'model/gltf+json';
      case 'glb':
        return 'model/gltf-binary';
      case 'obj':
        return 'model/obj';
      default:
        return 'application/octet-stream';
    }
  }

  // 提取IFC文件信息
  public extractIFCInfo(inputFile: string): any {
    try {
      const ifcConvertPath = this.getIfcConvertPath();
      const command = `${ifcConvertPath} --info "${inputFile}"`;
      
      const output = execSync(command, { encoding: 'utf-8' });
      
      // 解析IFC文件信息
      return this.parseIFCInfo(output);
    } catch (error) {
      console.error('提取IFC文件信息失败:', error);
      return null;
    }
  }

  // 解析IFC文件信息
  private parseIFCInfo(output: string): any {
    const info: any = {};
    
    // 简单解析，实际项目中可能需要更复杂的解析逻辑
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.includes('File format:')) {
        info.format = line.split(':')[1].trim();
      } else if (line.includes('Project:')) {
        info.project = line.split(':')[1].trim();
      } else if (line.includes('Author:')) {
        info.author = line.split(':')[1].trim();
      } else if (line.includes('Organisation:')) {
        info.organisation = line.split(':')[1].trim();
      } else if (line.includes('Created:')) {
        info.created = line.split(':')[1].trim();
      } else if (line.includes('Last modified:')) {
        info.lastModified = line.split(':')[1].trim();
      }
    });
    
    return info;
  }
}

export default new IFCConversionService();
