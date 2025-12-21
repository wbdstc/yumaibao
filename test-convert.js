const path = require('path');
const ifcConversionService = require('./yumaobao-backend/dist/utils/ifcConversionService').default;

// 测试IFC转换
async function testIFCConversion() {
  console.log('开始测试IFC转换...');
  
  // 确保你有一个test.ifc文件在当前目录下
  const inputFile = path.join(__dirname, 'test.ifc');
  const outputFormat = 'glb';
  
  try {
    const result = await ifcConversionService.convertIFC({
      inputFile,
      outputFormat,
      isLightweight: true,
      quality: 80,
      includeMaterials: true,
      includeTextures: true
    });
    
    console.log('转换结果:', result);
    
    if (result.success) {
      console.log('转换成功！');
    } else {
      console.log('转换失败:', result.message);
    }
  } catch (error) {
    console.error('转换过程中发生错误:', error);
  }
}

testIFCConversion();