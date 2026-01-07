// ==================== 身份验证模块 ====================

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 检查本地存储中是否有登录信息
  const savedUser = localStorage.getItem('admin_user')
  if (savedUser) {
    currentUser = JSON.parse(savedUser)
    showMainApp()
  } else {
    // 如果没有本地登录信息，则可能需要显示登录页面
    // 此处保留空白，因为主应用逻辑会处理用户数据的加载
  }
})

// 登录处理
async function handleLogin() {
  console.log('handleLogin函数被调用')
  
  const username = document.getElementById('login-username').value.trim()
  const password = document.getElementById('login-password').value.trim()
  const errorElement = document.getElementById('login-error')
  
  // 清空之前的错误信息
  errorElement.textContent = ''
  errorElement.style.display = 'none'
  
  try {
    console.log('尝试登录，用户名:', username)
    console.log('Supabase client:', window.supabase)
    console.log('ADMIN_CONFIG:', window.ADMIN_CONFIG)
    console.log('bcrypt available:', typeof bcrypt !== 'undefined')
    
    // 检查必需的全局变量
    if (typeof window.supabase === 'undefined') {
      throw new Error('Supabase client未初始化')
    }
    if (typeof bcrypt === 'undefined') {
      throw new Error('bcrypt未加载')
    }
    
    // 从数据库获取用户信息
    const { data: user, error } = await window.supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }

    console.log('用户数据:', user)

    // 使用 bcrypt 安全地比较密码哈希值
    if (user && user.password && bcrypt.compareSync(password, user.password)) {
      // 登录成功，保存用户信息到本地存储
      currentUser = user
      localStorage.setItem('admin_user', JSON.stringify(currentUser))
      
      // 显示主应用
      showMainApp()
    } else {
      // 密码错误或用户不存在
      errorElement.textContent = '用户名或密码错误'
      errorElement.style.display = 'block'
    }
  } catch (error) {
    console.error('登录失败:', error)
    errorElement.textContent = `登录失败: ${error.message || '未知错误'}`
    errorElement.style.display = 'block'
  }
}

// 显示主应用界面
async function showMainApp() {
  console.log('=== 开始显示主应用 ===');
  
  // 强制显示主应用，不依赖于选择器
  const loginContainer = document.querySelector('.login-container');
  const mainContainer = document.querySelector('.container');
  
  console.log('登录容器:', loginContainer);
  console.log('主容器:', mainContainer);
  
  // 如果找不到容器，尝试直接操作DOM
  if (!loginContainer) {
    console.error('未找到登录容器，尝试隐藏登录表单...');
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
      loginForm.style.display = 'none';
      console.log('登录表单已隐藏');
    }
  } else {
    loginContainer.style.display = 'none';
    console.log('登录容器已隐藏');
  }
  
  if (!mainContainer) {
    console.error('未找到主容器，尝试显示内容区域...');
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
      contentArea.style.display = 'block';
      console.log('内容区域已显示');
    }
  } else {
    mainContainer.classList.add('active');
    console.log('主容器已激活');
  }

  if (currentUser) {
    console.log('当前用户:', currentUser);
    const usernameEl = document.getElementById('current-username');
    const roleEl = document.getElementById('current-role');
    
    if (usernameEl) {
      usernameEl.textContent = currentUser.username;
      console.log('用户名已显示');
    } else {
      console.error('未找到用户名元素');
    }
    
    if (roleEl) {
      roleEl.textContent = getRoleName(currentUser.role);
      console.log('角色已显示');
    } else {
      console.error('未找到角色元素');
    }
    
    setUserPermissions(currentUser.role);
  }

  // 清除所有数据缓存，确保使用最新数据
  if (typeof clearCache === 'function') {
    clearCache();
    console.log('所有数据缓存已清除');
  }

  // 加载初始数据
  try {
    if (typeof loadInitialData === 'function') {
      console.log('尝试加载初始数据...');
      await loadInitialData();
      console.log('初始数据加载完成');
    } else {
      console.error('loadInitialData function not found. Data will not be loaded.');
      // 手动调用数据加载函数
      console.log('尝试手动加载数据...');
      if (typeof loadCompanies === 'function') await loadCompanies();
      if (typeof loadStations === 'function') await loadStations();
      if (typeof loadGroups === 'function') await loadGroups();
      if (typeof loadCollectors === 'function') await loadCollectors();
      if (typeof loadRecords === 'function') await loadRecords();
      console.log('手动数据加载完成');
    }
  } catch (error) {
    console.error('加载初始数据失败:', error);
  }
  
  console.log('=== 主应用显示完成 ===');
}

// 根据角色标识符获取角色名称
function getRoleName(role) {
  // 角色映射
  const roleMap = {
    super_admin: '超级管理员',
    company_admin: '分公司管理员',
    station_admin: '收费站管理员',
    centers_admin: '信调中心管理员'
  };
  return roleMap[role] || '未知角色';
}

// 根据用户角色设置界面权限
function setUserPermissions(role) {
  const allMenuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  
  // 先显示所有菜单项
  allMenuItems.forEach(item => {
    item.style.display = 'flex';
  });

  if (role === 'company_admin') {
    // 分公司管理员不能管理分公司，但可以管理用户
    document.querySelector('.menu-item[onclick*="companies"]').style.display = 'none';
    // document.querySelector('.menu-item[onclick*="users"]').style.display = 'none'; // 允许分公司管理员查看用户管理页面
  } else if (role === 'centers_admin') {
    // 信调中心管理员：显示监控员管理，隐藏收费员管理
    document.querySelector('.menu-item[onclick*="companies"]').style.display = 'none';
    document.querySelector('.menu-item[onclick*="stations"]').style.display = 'none';
    document.querySelector('.menu-item[onclick*="groups"]').style.display = 'none';
    // 隐藏收费员管理
    document.querySelector('.menu-item[onclick*="collectors"]').style.display = 'none';
    // 显示监控员管理
    document.querySelector('.menu-item[onclick*="monitors"]').style.display = 'flex';
    document.querySelector('.menu-item[onclick*="shifts"]').style.display = 'none';
    document.querySelector('.menu-item[onclick*="users"]').style.display = 'none';
  } else if (role === 'station_admin') {
    // 普通收费站管理员：显示收费员管理，隐藏监控员管理
    document.querySelector('.menu-item[onclick*="companies"]').style.display = 'none';
    document.querySelector('.menu-item[onclick*="stations"]').style.display = 'none';
    document.querySelector('.menu-item[onclick*="groups"]').style.display = 'none';
    // 显示收费员管理
    document.querySelector('.menu-item[onclick*="collectors"]').style.display = 'flex';
    // 隐藏监控员管理
    document.querySelector('.menu-item[onclick*="monitors"]').style.display = 'none';
    document.querySelector('.menu-item[onclick*="shifts"]').style.display = 'none';
    document.querySelector('.menu-item[onclick*="users"]').style.display = 'none';
  }
}


// 退出登录
function handleLogout() {
  // 清除本地存储
  localStorage.removeItem('admin_user')
  currentUser = null
  
  // 切换显示
  document.querySelector('.container').classList.remove('active')
  document.querySelector('.login-container').style.display = 'flex'
  
  // 重置登录表单
  document.getElementById('login-username').value = ''
  document.getElementById('login-password').value = ''
  document.getElementById('login-error').style.display = 'none'
}
