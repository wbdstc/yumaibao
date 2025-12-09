const axios = require('axios');

async function testProjectCreation() {
  try {
    // 先登录获取token
    const loginResponse = await axios.post('http://localhost:3000/api/users/login', {
      phone: '18502355555',
      password: '123456'
    });
    
    console.log('登录成功:', loginResponse.data);
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('用户角色:', user.role);
    
    // 使用获取的token创建项目
    const projectResponse = await axios.post('http://localhost:3000/api/projects', {
      name: '测试项目',
      code: 'TEST001',
      description: '这是一个测试项目',
      status: 'planning',
      startDate: '2023-12-01',
      endDate: '2023-12-31'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('项目创建成功:', projectResponse.data);
    
  } catch (error) {
    console.error('测试失败:', error.response ? error.response.data : error.message);
  }
}

testProjectCreation();