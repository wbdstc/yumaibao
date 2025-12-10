// 测试项目权限分配功能
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 配置axios
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 测试数据 - 生成唯一手机号避免重复注册
const timestamp = Date.now().toString().slice(-4);
const testData = {
  admin: {
    name: '测试管理员',
    phone: `13800138${timestamp}`,
    password: '123456',
    role: 'admin'
  },
  projectManager: {
    name: '测试项目管理员',
    phone: `13800139${timestamp}`,
    password: '123456',
    role: 'projectManager'
  },
  installer: {
    name: '测试安装人员',
    phone: `13800140${timestamp}`,
    password: '123456',
    role: 'installer'
  },
  qualityInspector: {
    name: '测试质检人员',
    phone: `13800141${timestamp}`,
    password: '123456',
    role: 'qualityInspector'
  },
  project: {
    name: '测试项目',
    code: `TEST-${Date.now()}`,
    description: '用于测试权限分配的项目'
  }
};

// 存储测试过程中的数据
const testStore = {
  users: {},
  projects: {},
  tokens: {}
};

// 辅助函数
async function registerUser(userData) {
  console.log(`注册用户: ${userData.name} (${userData.role})`);
  try {
    const response = await api.post('/users/register', userData);
    console.log(`✅ 用户注册成功: ${userData.name}`);
    return response.data;
  } catch (error) {
    console.error(`❌ 用户注册失败: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function loginUser(phone, password) {
  console.log(`登录用户: ${phone}`);
  try {
    const response = await api.post('/users/login', { phone, password });
    console.log(`✅ 用户登录成功`);
    return response.data;
  } catch (error) {
    console.error(`❌ 用户登录失败: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function createProject(projectData, token) {
  console.log(`创建项目: ${projectData.name}`);
  try {
    const response = await api.post('/projects', projectData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ 项目创建成功: ${projectData.name}`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ 项目创建失败: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function getProjects(token) {
  console.log('获取项目列表');
  try {
    const response = await api.get('/projects', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ 获取项目列表成功，共 ${response.data.length} 个项目`);
    return response.data;
  } catch (error) {
    console.error(`❌ 获取项目列表失败: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function updateUserProjects(userId, projects, token) {
  console.log(`更新用户 ${userId} 的项目关联`);
  try {
    const response = await api.put(`/users/${userId}`, { projects }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ 更新用户项目关联成功`);
    return response.data;
  } catch (error) {
    console.error(`❌ 更新用户项目关联失败: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

async function getCurrentUser(token) {
  console.log('获取当前用户信息');
  try {
    const response = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ 获取当前用户信息成功`);
    return response.data.user;
  } catch (error) {
    console.error(`❌ 获取当前用户信息失败: ${error.response?.data?.message || error.message}`);
    throw error;
  }
}

// 测试流程
async function runTests() {
  console.log('🚀 开始项目权限分配测试\n');
  
  try {
    // 1. 注册项目管理员
    const pmData = await registerUser(testData.projectManager);
    testStore.users.projectManager = pmData.user;
    
    // 2. 登录项目管理员
    const pmLogin = await loginUser(testData.projectManager.phone, testData.projectManager.password);
    testStore.tokens.projectManager = pmLogin.token;
    
    // 3. 创建测试项目
    const project = await createProject({
      name: testData.project.name,
      code: testData.project.code,
      description: testData.project.description
    }, testStore.tokens.projectManager);
    testStore.projects.testProject = project;
    
    // 4. 注册安装人员并分配项目
    const installerData = await registerUser({
      ...testData.installer,
      projects: [project.id] // 注册时直接分配项目
    });
    testStore.users.installer = installerData.user;
    
    // 5. 注册质检人员
    const inspectorData = await registerUser({
      ...testData.qualityInspector,
      projects: [project.id] // 注册时直接分配项目
    });
    testStore.users.qualityInspector = inspectorData.user;
    
    // 6. 登录安装人员
    const installerLogin = await loginUser(testData.installer.phone, testData.installer.password);
    testStore.tokens.installer = installerLogin.token;
    
    // 7. 测试安装人员获取项目列表（应该只能看到分配的项目）
    console.log('\n🔍 测试安装人员访问项目权限');
    const installerProjects = await getProjects(testStore.tokens.installer);
    
    if (installerProjects.length === 1 && installerProjects[0].id === project.id) {
      console.log('✅ 安装人员只能看到分配的项目');
    } else {
      console.error('❌ 安装人员看到的项目不符合预期');
      console.error('   预期: 1 个项目');
      console.error(`   实际: ${installerProjects.length} 个项目`);
      if (installerProjects.length > 0) {
        console.error('   项目ID:', installerProjects.map(p => p.id));
      }
    }
    
    // 8. 登录项目管理员，查看所有项目
    console.log('\n🔍 测试项目管理员访问项目权限');
    const pmProjects = await getProjects(testStore.tokens.projectManager);
    
    if (pmProjects.length >= 1) {
      console.log('✅ 项目管理员可以看到所有项目');
    } else {
      console.error('❌ 项目管理员看不到项目');
    }
    
    // 9. 测试获取当前用户信息
    console.log('\n🔍 测试获取当前用户信息');
    const installerUser = await getCurrentUser(testStore.tokens.installer);
    
    if (installerUser.projects && installerUser.projects.includes(project.id)) {
      console.log('✅ 用户信息中包含正确的项目关联');
    } else {
      console.error('❌ 用户信息中项目关联不正确');
    }
    
    console.log('\n🎉 所有测试完成！');
    console.log('\n📋 测试总结:');
    console.log(`   1. 项目管理员: ${testData.projectManager.phone}`);
    console.log(`   2. 安装人员: ${testData.installer.phone} (关联项目: ${project.name})`);
    console.log(`   3. 质检人员: ${testData.qualityInspector.phone} (关联项目: ${project.name})`);
    console.log(`   4. 测试项目: ${project.name} (ID: ${project.id})`);
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
runTests();