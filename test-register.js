// 测试注册API的脚本
const axios = require('axios');

async function testRegister() {
  console.log('测试用户注册API...');
  
  // 测试数据
  const registerData = {
    name: '测试用户',
    phone: '13800138000',
    password: '123456',
    confirmPassword: '123456',
    role: 'installer'
  };
  
  try {
    // 直接调用后端API（绕过前端代理）
    console.log('发送请求到: http://localhost:3000/api/users/register');
    console.log('请求数据:', registerData);
    
    const response = await axios.post('http://localhost:3000/api/users/register', registerData);
    console.log('注册成功:', response.data);
    return true;
  } catch (error) {
    console.error('注册失败:', error.message);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', JSON.stringify(error.response.data, null, 2));
      console.error('错误头信息:', error.response.headers);
    } else if (error.request) {
      console.error('请求已发送但未收到响应:', error.request);
    } else {
      console.error('请求配置错误:', error.config);
    }
    return false;
  }
}

// 运行测试
testRegister();