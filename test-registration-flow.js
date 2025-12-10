// 测试注册流程的脚本
const axios = require('axios');

// 配置axios实例
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 生成随机手机号用于测试
const randomPhone = '13' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
const testUser = {
  name: '测试用户',
  phone: randomPhone,
  password: '123456',
  role: 'installer'
};

console.log('开始测试注册流程...');
console.log('测试手机号:', testUser.phone);

// 1. 测试注册
api.post('/users/register', testUser)
  .then(registerResponse => {
    console.log('\n1. 注册成功！');
    console.log('注册响应:', registerResponse.data);
    
    // 2. 测试登录
    return api.post('/users/login', {
      phone: testUser.phone,
      password: testUser.password
    });
  })
  .then(loginResponse => {
    console.log('\n2. 登录成功！');
    console.log('登录响应:', loginResponse.data);
    
    // 3. 测试使用token访问受保护资源
    const token = loginResponse.data.token;
    return api.get('/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  })
  .then(profileResponse => {
    console.log('\n3. 获取用户信息成功！');
    console.log('用户信息:', profileResponse.data);
    
    console.log('\n✅ 所有测试通过！注册流程正常工作。');
  })
  .catch(error => {
    console.log('\n❌ 测试失败！');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
      console.log('请求数据:', error.response.config.data);
    } else if (error.request) {
      console.log('请求已发出，但没有收到响应');
    } else {
      console.log('请求配置错误:', error.message);
    }
    process.exit(1);
  });