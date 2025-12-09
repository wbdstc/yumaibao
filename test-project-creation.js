const axios = require('axios');

// 测试脚本：测试登录和创建项目功能
async function testProjectCreation() {
  try {
    // 0. 测试健康检查接口
    console.log('=== 测试健康检查接口 ===');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('健康检查成功！', healthResponse.data);
    
    // 1. 使用已存在的用户登录
    console.log('\n=== 测试登录功能 ===');
    const loginResponse = await axios.post('http://localhost:3000/api/users/login', {
      phone: '13800138000',
      password: '123456'
    });
    
    console.log('登录成功！');
    console.log('用户信息:', loginResponse.data.user);
    console.log('Token:', loginResponse.data.token);
    
    // 2. 使用token创建项目
    console.log('\n=== 测试创建项目功能 ===');
    console.log('请求URL: http://localhost:3000/api/projects');
    console.log('请求头: Authorization: Bearer ' + loginResponse.data.token);
    const projectResponse = await axios.post('http://localhost:3000/api/projects', {
      name: '测试项目',
      description: '这是一个测试项目',
      location: '测试地点',
      startTime: '2023-01-01',
      endTime: '2023-12-31'
    }, {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('创建项目成功！');
    console.log('项目信息:', projectResponse.data);
    
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
      console.error('响应头:', error.response.headers);
    } else if (error.request) {
      console.error('请求已发出但未收到响应');
      console.error('请求详情:', error.request);
    } else {
      console.error('请求配置错误:', error.config);
    }
    
    // 4. 测试根路径访问
    console.log('\n=== 测试根路径访问 ===');
    try {
      const rootResponse = await axios.post('http://localhost:3000/', {}, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      console.log('根路径访问成功:', rootResponse.data);
    } catch (rootError) {
      console.error('根路径访问失败:', rootError.message);
      if (rootError.response) {
        console.error('根路径响应状态码:', rootError.response.status);
        console.error('根路径响应数据:', rootError.response.data);
      }
    }
  }
}

testProjectCreation();