const fs = require('fs');
const path = require('path');

// 模拟ifcConversionService的检查逻辑
const ifcOpenShellPath = process.env.IFC_OPEN_SHELL_PATH || 'C:\\Program Files\\IfcOpenShell';
const ext = process.platform === 'win32' ? '.exe' : '';
const ifcConvertPath = path.join(ifcOpenShellPath, `IfcConvert${ext}`);

console.log('IfcOpenShell路径:', ifcOpenShellPath);
console.log('IfcConvert路径:', ifcConvertPath);
console.log('文件是否存在:', fs.existsSync(ifcConvertPath));

// 尝试执行IfcConvert --version命令
const { exec } = require('child_process');
exec(`"${ifcConvertPath}" --version`, (error, stdout, stderr) => {
  if (error) {
    console.error('执行IfcConvert --version失败:', error);
    console.error('错误输出:', stderr);
  } else {
    console.log('IfcConvert版本信息:', stdout);
  }
});