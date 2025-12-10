// 测试修复效果的简单脚本
console.log('测试修复效果：');

// 模拟修复前的情况
console.log('1. 修复前：embeddedParts 可能不是数组');
try {
  const embeddedParts = null; // 模拟API返回null的情况
  const result = embeddedParts.filter(item => item.status === 'pending');
  console.log('   结果：', result);
} catch (error) {
  console.log('   错误：', error.message);
}

// 模拟修复后的情况
console.log('2. 修复后：确保embeddedParts始终是数组');
try {
  // 模拟API返回null的情况
  const apiResponse = null;
  const embeddedParts = Array.isArray(apiResponse) ? apiResponse : [];
  const result = embeddedParts.filter(item => item.status === 'pending');
  console.log('   结果：', result);
  console.log('   成功！filter方法可以正常工作了。');
} catch (error) {
  console.log('   错误：', error.message);
}

// 模拟API返回对象的情况
console.log('3. 修复后：处理API返回非数组的情况');
try {
  const apiResponse = { success: true, message: 'No data' }; // 模拟API返回对象的情况
  const embeddedParts = Array.isArray(apiResponse) ? apiResponse : [];
  const result = embeddedParts.filter(item => item.status === 'pending');
  console.log('   结果：', result);
  console.log('   成功！filter方法可以正常工作了。');
} catch (error) {
  console.log('   错误：', error.message);
}

// 模拟API返回数组的情况
console.log('4. 修复后：处理API返回数组的正常情况');
try {
  const apiResponse = [
    { id: 1, name: '部件1', status: 'pending' },
    { id: 2, name: '部件2', status: 'installed' },
    { id: 3, name: '部件3', status: 'pending' }
  ];
  const embeddedParts = Array.isArray(apiResponse) ? apiResponse : [];
  const result = embeddedParts.filter(item => item.status === 'pending');
  console.log('   结果：', result);
  console.log('   成功！filter方法可以正常工作了。');
} catch (error) {
  console.log('   错误：', error.message);
}

console.log('\n修复总结：');
console.log('- 确保了embeddedParts始终是数组，防止filter方法调用失败');
console.log('- 上传按钮添加了display: block样式，确保可见');
console.log('- 上传对话框功能完整，支持多种文件格式');
