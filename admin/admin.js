// Supabase 配置
const SUPABASE_URL = 'https://codvnervcuxohwtxotpn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZHZuZXJ2Y3V4b2h3dHhvdHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTg0MjQsImV4cCI6MjA4MTA5NDQyNH0.FrxgBbqYWmlhrSKZPLtZzn1DMcVEwyGTHs4mKYUuUTQ'

// 初始化 Supabase 客户端
// 当通过script标签引入supabase-js库时，它会在全局作用域中自动创建supabase变量
// 我们直接使用这个全局变量，不需要重新声明
if (typeof window !== 'undefined' && window.supabase && !window.supabase._initialized) {
  // 初始化window.supabase客户端
  window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase._initialized = true;
}

// 全局变量
let currentTab = 'records'
let allRecords = []
let filteredRecords = []
let allCompanies = []
let allStations = []
let allGroups = []
let allCollectors = []
let allMonitors = []
let allShifts = []
let allUsers = []
let startDate = ''
let endDate = ''
let selectedStationId = ''
let currentUser = null

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 检查本地存储中是否有登录信息
  const savedUser = localStorage.getItem('admin_user')
  if (savedUser) {
    currentUser = JSON.parse(savedUser)
    showMainApp()
  } else {
    // 尝试从数据库加载用户数据，确保初始用户已创建
    await loadUsers()
  }
})

// 登录处理
async function handleLogin(event) {
  event.preventDefault()
  
  const username = document.getElementById('login-username').value.trim()
  const password = document.getElementById('login-password').value.trim()
  const errorElement = document.getElementById('login-error')
  
  // 清空之前的错误信息
  errorElement.textContent = ''
  errorElement.style.display = 'none'
  
  try {
    console.log('尝试登录，用户名:', username)
    
    // 从数据库获取用户信息
    const { data: user, error } = await window.supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single()
    
    console.log('查询结果:', { user, error })
    
    if (error) {
      // 处理查询错误
      if (error.code === 'PGRST116') {
        // 没有找到用户
        errorElement.textContent = '用户名或密码错误'
        errorElement.style.display = 'block'
      } else {
        // 其他数据库错误
        throw error
      }
      return
    }
    
    // 简单的密码验证（实际项目中应该使用加密存储）
    if (user && user.password === password) {
      // 登录成功，保存用户信息到本地存储
      currentUser = user
      localStorage.setItem('admin_user', JSON.stringify(currentUser))
      
      console.log('登录成功，用户信息:', currentUser)
      
      // 显示主应用
      showMainApp()
    } else {
      // 密码错误
      errorElement.textContent = '用户名或密码错误'
      errorElement.style.display = 'block'
    }
  } catch (error) {
    console.error('登录失败:', error)
    errorElement.textContent = `登录失败: ${error.message || '未知错误'}`
    errorElement.style.display = 'block'
  }
}

// 显示主应用
async function showMainApp() {
  // 更新用户信息显示
  document.getElementById('current-username').textContent = currentUser.username
  document.getElementById('current-role').textContent = getRoleName(currentUser.role)
  
  // 切换显示
  document.querySelector('.login-container').style.display = 'none'
  document.querySelector('.container').classList.add('active')
  
  // 根据用户角色设置权限
  setUserPermissions()
  
  // 加载数据
  await loadAllData()
  await initFilters()
  renderCurrentTab()
}

// 获取角色名称
function getRoleName(role) {
  const roleMap = {
    'super_admin': '超级管理员',
    'company_admin': '分公司管理员',
    'station_admin': '收费站管理员'
  }
  return roleMap[role] || role
}

// 设置用户权限
function setUserPermissions() {
  // 超级管理员：所有功能可用
  // 分公司管理员：只能管理自己分公司下的内容
  // 收费站管理员：只能管理自己收费站下的内容
  
  // 限制菜单项访问
  const menuItems = document.querySelectorAll('.menu-item')
  
  // 根据角色隐藏/显示菜单，确保currentUser不为null
  if (currentUser) {
    if (currentUser.role === 'station_admin') {
      // 收费站管理员只能访问有限功能
      menuItems.forEach(item => {
        const text = item.querySelector('.menu-text').textContent
        if (text === '分公司管理' || text === '收费站管理') {
          item.style.display = 'none'
        }
      })
    }
  }
  
  // 根据角色限制数据访问
  // 这部分在数据加载和渲染函数中实现
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

// 初始化筛选器
async function initFilters() {
  // 填充分公司筛选下拉框
  const groupCompanyFilter = document.getElementById('group-company-filter');
  const collectorCompanyFilter = document.getElementById('collector-company-filter');
  const monitorCompanyFilter = document.getElementById('monitor-company-filter');
  const recordCompanyFilter = document.getElementById('record-company-filter');
  const stationCompanyFilter = document.getElementById('station-company-filter');
  
  // 填充收费站筛选下拉框
  const stationFilter = document.getElementById('group-station-filter');
  const collectorStationFilter = document.getElementById('collector-station-filter');
  const monitorStationFilter = document.getElementById('monitor-station-filter');
  const recordStationFilter = document.getElementById('record-station-filter');
  
  // 填充分公司选项
  if (groupCompanyFilter && collectorCompanyFilter && monitorCompanyFilter && recordCompanyFilter && stationCompanyFilter && allCompanies.length > 0) {
    // 清空现有选项
    groupCompanyFilter.innerHTML = '<option value="">所有分公司</option>';
    collectorCompanyFilter.innerHTML = '<option value="">所有分公司</option>';
    monitorCompanyFilter.innerHTML = '<option value="">所有分公司</option>';
    recordCompanyFilter.innerHTML = '<option value="">所有分公司</option>';
    stationCompanyFilter.innerHTML = '<option value="">所有分公司</option>';
    
    // 添加分公司选项
    allCompanies.forEach(company => {
      const option1 = document.createElement('option');
      option1.value = company.id;
      option1.textContent = company.name;
      groupCompanyFilter.appendChild(option1);
      
      const option2 = document.createElement('option');
      option2.value = company.id;
      option2.textContent = company.name;
      collectorCompanyFilter.appendChild(option2);
      
      const option3 = document.createElement('option');
      option3.value = company.id;
      option3.textContent = company.name;
      monitorCompanyFilter.appendChild(option3);
      
      const option4 = document.createElement('option');
      option4.value = company.id;
      option4.textContent = company.name;
      recordCompanyFilter.appendChild(option4);
      
      const option5 = document.createElement('option');
      option5.value = company.id;
      option5.textContent = company.name;
      stationCompanyFilter.appendChild(option5);
    });
    
    // 添加分公司筛选事件监听
    groupCompanyFilter.addEventListener('change', updateGroupStationOptions);
    groupCompanyFilter.addEventListener('change', renderGroups);
    
    collectorCompanyFilter.addEventListener('change', updateCollectorStationOptions);
    collectorCompanyFilter.addEventListener('change', renderCollectors);
    
    monitorCompanyFilter.addEventListener('change', updateMonitorStationOptions);
    monitorCompanyFilter.addEventListener('change', renderMonitors);
    
    recordCompanyFilter.addEventListener('change', updateRecordStationOptions);
    recordCompanyFilter.addEventListener('change', applyStationFilter);
    
    stationCompanyFilter.addEventListener('change', renderStations);
  }
  
  // 填充收费站选项
  if (stationFilter && collectorStationFilter && monitorStationFilter && recordStationFilter && allStations.length > 0) {
    updateGroupStationOptions();
    updateCollectorStationOptions();
    updateMonitorStationOptions();
    updateRecordStationOptions();
    
    // 添加收费站筛选事件监听
    stationFilter.addEventListener('change', renderGroups);
    stationFilter.addEventListener('change', updateCollectorGroupOptions);
    stationFilter.addEventListener('change', updateMonitorGroupOptions);
    
    collectorStationFilter.addEventListener('change', updateCollectorGroupOptions);
    collectorStationFilter.addEventListener('change', renderCollectors);
    
    monitorStationFilter.addEventListener('change', updateMonitorGroupOptions);
    monitorStationFilter.addEventListener('change', renderMonitors);
    
    // 初始化收费员班组筛选
    updateCollectorGroupFilter();
    updateMonitorGroupFilter();
    
    // 添加收费员班组筛选事件监听
    const collectorGroupFilter = document.getElementById('collector-group-filter');
    if (collectorGroupFilter) {
      collectorGroupFilter.addEventListener('change', renderCollectors);
    }
    
    // 添加监控员班组筛选事件监听
    const monitorGroupFilter = document.getElementById('monitor-group-filter');
    if (monitorGroupFilter) {
      monitorGroupFilter.addEventListener('change', renderMonitors);
    }
    
    // 添加事件监听
    recordStationFilter.addEventListener('change', (e) => {
      selectedStationId = e.target.value;
      applyStationFilter();
    });
  }
}

// 更新班组管理页面的收费站选项
function updateGroupStationOptions() {
  const companyFilter = document.getElementById('group-company-filter');
  const stationFilter = document.getElementById('group-station-filter');
  
  if (companyFilter && stationFilter && allStations.length > 0) {
    const selectedCompanyId = companyFilter.value;
    
    // 清空现有选项
    stationFilter.innerHTML = '<option value="">所有收费站</option>';
    
    // 根据选中的分公司筛选收费站
    let filteredStations = allStations;
    if (selectedCompanyId) {
      filteredStations = allStations.filter(station => station.company_id === selectedCompanyId);
    }
    
    // 添加收费站选项
    filteredStations.forEach(station => {
      const option = document.createElement('option');
      option.value = station.id;
      option.textContent = station.name;
      stationFilter.appendChild(option);
    });
    
    // 更新相关的班组筛选
    updateCollectorGroupFilter();
    updateMonitorGroupFilter();
  }
}

// 更新收费员管理页面的收费站选项
function updateCollectorStationOptions() {
  const companyFilter = document.getElementById('collector-company-filter');
  const stationFilter = document.getElementById('collector-station-filter');
  
  if (companyFilter && stationFilter && allStations.length > 0) {
    const selectedCompanyId = companyFilter.value;
    
    // 清空现有选项
    stationFilter.innerHTML = '<option value="">所有收费站</option>';
    
    // 根据选中的分公司筛选收费站
    let filteredStations = allStations;
    if (selectedCompanyId) {
      filteredStations = allStations.filter(station => station.company_id === selectedCompanyId);
    }
    
    // 添加收费站选项
    filteredStations.forEach(station => {
      const option = document.createElement('option');
      option.value = station.id;
      option.textContent = station.name;
      stationFilter.appendChild(option);
    });
    
    // 更新相关的班组筛选
    updateCollectorGroupFilter();
  }
}

// 更新监控员管理页面的收费站选项
function updateMonitorStationOptions() {
  const companyFilter = document.getElementById('monitor-company-filter');
  const stationFilter = document.getElementById('monitor-station-filter');
  
  if (companyFilter && stationFilter && allStations.length > 0) {
    const selectedCompanyId = companyFilter.value;
    
    // 清空现有选项
    stationFilter.innerHTML = '<option value="">所有收费站</option>';
    
    // 根据选中的分公司筛选收费站
    let filteredStations = allStations;
    if (selectedCompanyId) {
      filteredStations = allStations.filter(station => station.company_id === selectedCompanyId);
    }
    
    // 添加收费站选项
    filteredStations.forEach(station => {
      const option = document.createElement('option');
      option.value = station.id;
      option.textContent = station.name;
      stationFilter.appendChild(option);
    });
    
    // 更新相关的班组筛选
    updateMonitorGroupFilter();
  }
}

// 更新登记记录页面的收费站选项
function updateRecordStationOptions() {
  const companyFilter = document.getElementById('record-company-filter');
  const stationFilter = document.getElementById('record-station-filter');
  
  if (companyFilter && stationFilter && allStations.length > 0) {
    const selectedCompanyId = companyFilter.value;
    
    // 清空现有选项
    stationFilter.innerHTML = '<option value="">所有收费站</option>';
    
    // 根据选中的分公司筛选收费站
    let filteredStations = allStations;
    if (selectedCompanyId) {
      filteredStations = allStations.filter(station => station.company_id === selectedCompanyId);
    }
    
    // 添加收费站选项
    filteredStations.forEach(station => {
      const option = document.createElement('option');
      option.value = station.id;
      option.textContent = station.name;
      stationFilter.appendChild(option);
    });
  }
}

// 更新收费员班组筛选下拉框
function updateCollectorGroupFilter() {
  const stationFilter = document.getElementById('collector-station-filter');
  const groupFilter = document.getElementById('collector-group-filter');
  
  if (stationFilter && groupFilter) {
    const selectedStationId = stationFilter.value;
    
    // 清空现有选项
    groupFilter.innerHTML = '<option value="">所有班组</option>';
    
    // 根据选中的收费站筛选班组
    let filteredGroups = allGroups;
    if (selectedStationId) {
      filteredGroups = allGroups.filter(group => group.station_id === selectedStationId);
    }
    
    // 添加班组选项
    filteredGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      groupFilter.appendChild(option);
    });
  }
}

// 更新添加收费员模态框中的班组选项
function updateCollectorGroupOptions() {
  const stationSelect = document.getElementById('collector-station');
  const groupSelect = document.getElementById('collector-group');
  
  if (stationSelect && groupSelect) {
    const selectedStationId = stationSelect.value;
    
    // 清空现有选项
    groupSelect.innerHTML = '<option value="">请选择班组</option>';
    
    // 根据选中的收费站筛选班组
    let filteredGroups = allGroups;
    if (selectedStationId) {
      filteredGroups = allGroups.filter(group => group.station_id === selectedStationId);
    }
    
    // 添加班组选项
    filteredGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      groupSelect.appendChild(option);
    });
  }
}

// 更新监控员班组筛选下拉框
function updateMonitorGroupFilter() {
  const stationFilter = document.getElementById('monitor-station-filter');
  const groupFilter = document.getElementById('monitor-group-filter');
  
  if (stationFilter && groupFilter) {
    const selectedStationId = stationFilter.value;
    
    // 清空现有选项
    groupFilter.innerHTML = '<option value="">所有班组</option>';
    
    // 根据选中的收费站筛选班组
    let filteredGroups = allGroups;
    if (selectedStationId) {
      filteredGroups = allGroups.filter(group => group.station_id === selectedStationId);
    }
    
    // 添加班组选项
    filteredGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      groupFilter.appendChild(option);
    });
  }
}

// 更新添加监控员模态框中的班组选项
function updateMonitorGroupOptions() {
  const stationSelect = document.getElementById('monitor-station');
  const groupSelect = document.getElementById('monitor-group');
  
  if (stationSelect && groupSelect) {
    const selectedStationId = stationSelect.value;
    
    // 清空现有选项
    groupSelect.innerHTML = '<option value="">请选择班组</option>';
    
    // 根据选中的收费站筛选班组
    let filteredGroups = allGroups;
    if (selectedStationId) {
      filteredGroups = allGroups.filter(group => group.station_id === selectedStationId);
    }
    
    // 添加班组选项
    filteredGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      groupSelect.appendChild(option);
    });
  }
}

// 加载所有数据
async function loadAllData() {
  // 按顺序加载数据，确保依赖关系正确
  await loadCompanies();  // 先加载分公司
  await loadStations(); // 再加载收费站（依赖分公司）
  await loadGroups();    // 再加载班组（依赖收费站）
  await loadCollectors(); // 再加载收费员（依赖班组）
  await loadMonitors();   // 再加载监控员
  await loadShifts();     // 再加载班次
  await loadRecords();    // 最后加载记录（依赖收费员）
  await loadUsers();      // 加载用户数据
  
  // 重新应用所有筛选条件
  applyAllFilters()
}

// 加载用户数据
async function loadUsers() {
  try {
    console.log('开始加载用户数据...')
    const { data, error } = await window.supabase
      .from('admin_users')
      .select('*, companies(name), toll_stations(name)')
      .order('created_at', { ascending: false })
    
    console.log('加载用户数据结果:', { data, error })
    
    if (error) {
      console.error('加载用户错误:', error)
      // 如果是表不存在的错误，显示创建表的提示
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('表不存在')) {
        showAlert('用户表不存在，请联系系统管理员创建相关表结构', 'error')
      } else {
        showAlert(`加载用户失败: ${error.message || '未知错误'}`, 'error')
      }
      return
    }
    
    allUsers = data || []
    console.log('成功加载用户数量:', allUsers.length)
    
    // 如果没有用户，创建初始用户
    if (allUsers.length === 0) {
      await initAdminUsers()
    }
  } catch (error) {
    console.error('加载用户失败:', error)
    showAlert(`加载用户失败: ${error.message || '未知错误'}`, 'error')
  }
}

// 初始化管理员用户
async function initAdminUsers() {
  try {
    console.log('开始初始化管理员用户...')
    
    // 检查是否已有用户
    const { data: users, error: usersError } = await window.supabase
      .from('admin_users')
      .select('*')
    
    console.log('检查现有用户结果:', { users, usersError })
    
    if (!usersError && (!users || users.length === 0)) {
      console.log('系统中暂无用户，请联系系统管理员创建初始管理员账户')
      showAlert('系统中暂无用户，请联系系统管理员创建初始管理员账户', 'warning')
      return
    }
  } catch (error) {
    console.error('初始化用户失败:', error)
    showAlert(`初始化用户失败: ${error.message || '未知错误'}，请联系系统管理员`, 'error')
  }
}



// 修复：修改loadStations函数，确保正确获取和映射分公司数据
async function loadStations() {
  try {
    console.log('=== 加载收费站数据 ===')
    
    // 1. 直接使用JOIN查询获取收费站和分公司的关联数据
    console.log('1. 直接使用JOIN查询获取关联数据...')
    
    let query = window.supabase
      .from('toll_stations')
      .select('*, companies(name)')  // 使用JOIN查询获取分公司名称
      .order('created_at', { ascending: false })
    
    // 根据用户角色过滤数据，确保currentUser不为null
    if (currentUser) {
      if (currentUser.role === 'company_admin') {
        // 分公司管理员只能看到自己分公司下的收费站
        query = query.eq('company_id', currentUser.company_id)
      } else if (currentUser.role === 'station_admin') {
        // 收费站管理员只能看到自己管理的收费站
        query = query.eq('id', currentUser.station_id)
      }
    }
    
    const { data: stationsData, error: stationsError } = await query
    
    if (stationsError) {
      console.error('加载收费站错误:', stationsError)
      throw stationsError
    }
    
    console.log('2. JOIN查询成功，获取到数据:', stationsData)
    console.log('数据长度:', stationsData.length)
    
    // 2. 处理查询结果
    allStations = stationsData.map(station => {
      // 直接从JOIN结果中获取分公司名称
      const companyName = station.companies ? station.companies.name : '无'
      
      console.log(`3. 处理收费站: ${station.name}`)
      console.log(`   原始company_id: ${station.company_id}`)
      console.log(`   关联的分公司数据:`, station.companies)
      console.log(`   最终分公司名称: ${companyName}`)
      
      // 返回处理后的数据，包含company_name字段
      return {
        ...station,
        company_name: companyName,  // 添加company_name字段
        // 清理不需要的companies对象
        companies: undefined
      }
    })
    
    console.log('4. 最终处理后的收费站数据:', allStations)
    
    // 5. 验证处理结果
    allStations.forEach(station => {
      console.log(`   ${station.name}: company_id=${station.company_id}, company_name=${station.company_name}`)
    })
    
  } catch (error) {
    console.error('加载收费站失败:', error)
    console.error('错误堆栈:', error.stack)
    // 降级处理：使用简化的数据加载
    try {
      console.log('5. 尝试降级加载数据...')
      
      let query = window.supabase
        .from('toll_stations')
        .select('*')
        .order('created_at', { ascending: false })
      
      // 根据用户角色过滤数据，确保currentUser不为null
      if (currentUser) {
        if (currentUser.role === 'company_admin') {
          query = query.eq('company_id', currentUser.company_id)
        } else if (currentUser.role === 'station_admin') {
          query = query.eq('id', currentUser.station_id)
        }
      }
      
      const { data: simpleData } = await query
      
      allStations = simpleData.map(station => ({
        ...station,
        company_name: '无',  // 降级处理，默认显示无
        companies: undefined
      }))
      console.log('降级加载成功，数据长度:', allStations.length)
    } catch (fallbackError) {
      console.error('降级加载也失败:', fallbackError)
      allStations = []
      showAlert('加载收费站失败，请检查数据库连接', 'error')
    }
  }
}

// 应用所有筛选条件
function applyAllFilters() {
  // 先应用关键词搜索
  const keyword = document.getElementById('search-records')?.value?.toLowerCase() || '';
  let tempFilteredRecords = allRecords;
  
  if (keyword) {
    tempFilteredRecords = tempFilteredRecords.filter(record => 
      (record.plate_number && record.plate_number.toLowerCase().includes(keyword)) ||
      (record.free_reason && record.free_reason.toLowerCase().includes(keyword)) ||
      (record.toll_collector && record.toll_collector.toLowerCase().includes(keyword)) ||
      (record.monitor && record.monitor.toLowerCase().includes(keyword))
    );
  }
  
  // 再应用收费站筛选
  if (selectedStationId) {
    filteredRecords = tempFilteredRecords.filter(record => record.station_id === selectedStationId);
  } else {
    filteredRecords = [...tempFilteredRecords];
  }
  
  // 重新渲染表格
  if (currentTab === 'records') {
    renderRecords();
  }
  
  // 重新初始化筛选器，确保下拉框选项正确
  initFilters();
}

// 切换标签页
function switchTab(event, tabName) {
  currentTab = tabName
  
  // 更新标签样式
  document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'))
  event.target.classList.add('active')
  
  // 更新内容显示
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'))
  document.getElementById(`${tabName}-tab`).classList.add('active')
  
  renderCurrentTab()
}

// 渲染当前标签页
function renderCurrentTab() {
  switch(currentTab) {
    case 'records':
      renderRecords()
      updateStats()
      break
    case 'companies':
      renderCompanies()
      break
    case 'stations':
      renderStations()
      break
    case 'groups':
      renderGroups()
      break
    case 'collectors':
      renderCollectors()
      break
    case 'monitors':
      renderMonitors()
      break
    case 'shifts':
      renderShifts()
      break
    case 'users':
      renderUsers()
      break
  }
}

// ==================== 登记记录管理 ====================

async function loadRecords() {
  try {
    console.log('开始加载登记记录...')
    console.log('日期筛选条件:')
    console.log('startDate:', startDate)
    console.log('endDate:', endDate)
    console.log('Supabase URL:', SUPABASE_URL)
    console.log('Supabase Key (前20字符):', SUPABASE_ANON_KEY.substring(0, 20) + '...')
    
    let query = window.supabase
      .from('toll_records')
      .select(`
        id,
        plate_number,
        free_reason,
        vehicle_type,
        axle_count,
        tonnage,
        entry_info,
        toll_collector,
        monitor,
        amount,
        created_at
      `)
      .order('created_at', { ascending: false })
    
    // 应用日期筛选
    if (startDate) {
      console.log('应用开始日期筛选:', startDate)
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      // 添加一天的时间，确保包含结束日期当天的所有记录
      const endDateWithTime = new Date(endDate)
      endDateWithTime.setDate(endDateWithTime.getDate() + 1)
      console.log('应用结束日期筛选:', endDate, '转换为:', endDateWithTime.toISOString())
      query = query.lt('created_at', endDateWithTime.toISOString())
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Supabase查询错误:', error)
      throw error
    }
    
    console.log('成功加载记录数量:', data ? data.length : 0)
    console.log('记录数据:', data)
    
    // 为每条记录添加收费站信息
    const recordsWithStation = data.map(record => {
      // 查找对应的收费员，尝试匹配工号或姓名
      let collector = null;
      
      // 尝试通过工号匹配（假设toll_collector格式为"工号 姓名"）
      const parts = record.toll_collector?.split(' ');
      if (parts && parts.length >= 2) {
        const employeeId = parts[0];
        collector = allCollectors.find(c => c.code === employeeId);
      }
      
      // 如果工号匹配失败，尝试通过姓名匹配
      if (!collector) {
        const name = record.toll_collector?.split(' ')[1] || record.toll_collector;
        collector = allCollectors.find(c => c.name === name);
      }
      
      // 从收费员信息中获取收费站名称和ID
      let stationName = '未知';
      let stationId = '';
      
      if (collector?.toll_groups) {
        // 如果有班组信息，尝试从班组获取收费站信息
        if (collector.toll_groups.toll_stations) {
          stationName = collector.toll_groups.toll_stations.name;
          stationId = collector.toll_groups.station_id;
        } else {
          // 如果班组没有直接关联收费站，尝试从allStations中查找
          const station = allStations.find(s => s.id === collector.toll_groups.station_id);
          stationName = station?.name || '未知';
          stationId = collector.toll_groups.station_id;
        }
      }
      
      return {
        ...record,
        station_name: stationName,
        station_id: stationId
      };
    });
    
    // 根据用户角色过滤记录，确保currentUser不为null
    let filteredByRole = recordsWithStation;
    
    if (currentUser) {
      if (currentUser.role === 'company_admin') {
        // 分公司管理员只能看到自己分公司下的记录
        // 获取用户分公司下的所有收费站ID
        const companyStationIds = allStations.map(station => station.id);
        filteredByRole = recordsWithStation.filter(record => 
          companyStationIds.includes(record.station_id)
        );
      } else if (currentUser.role === 'station_admin') {
        // 收费站管理员只能看到自己收费站下的记录
        filteredByRole = recordsWithStation.filter(record => 
          record.station_id === currentUser.station_id
        );
      }
    }
    
    allRecords = filteredByRole || []
    filteredRecords = [...allRecords] // 初始化过滤后的记录
  } catch (error) {
    console.error('加载记录失败:', error)
    console.error('错误详情:', JSON.stringify(error, null, 2))
    showAlert(`加载记录失败: ${error.message || '未知错误'}`, 'error')
  }
}

// 应用日期筛选
function applyDateFilter() {
  startDate = document.getElementById('start-date').value
  endDate = document.getElementById('end-date').value
  
  // 彩蛋：结束日期早于开始日期时触发
  if (startDate && endDate && endDate < startDate) {
    // 使用模态框显示彩蛋
    showModal('🎉 恭喜您触发彩蛋！', `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin: 20px 0;">😁</div>
        <h3 style="color: #4f46e5; margin: 20px 0;">获得「没有脑子」称号！</h3>
        <p style="font-size: 18px; color: #64748b; margin: 20px 0;">该称号将为所有用户播报！</p>
        <p style="font-size: 14px; color: #94a3b8; margin-top: 30px;">提示：结束日期不能早于开始日期哦~</p>
      </div>
    `, null, '拾取脑子')
    return
  }
  
  loadAllData() // 重新加载数据，应用筛选条件
}

// 清空日期筛选
function clearDateFilter() {
  document.getElementById('start-date').value = ''
  document.getElementById('end-date').value = ''
  startDate = ''
  endDate = ''
  
  loadAllData() // 重新加载数据，清除筛选条件
}

// 应用收费站筛选
function applyStationFilter() {
  const companyFilter = document.getElementById('record-company-filter');
  const stationFilter = document.getElementById('record-station-filter');
  
  // 先根据分公司筛选
  let tempFilteredRecords = allRecords;
  
  if (companyFilter && companyFilter.value) {
    const selectedCompanyId = companyFilter.value;
    // 找到该分公司下的所有收费站ID
    const stationIds = allStations
      .filter(station => station.company_id === selectedCompanyId)
      .map(station => station.id);
    
    tempFilteredRecords = tempFilteredRecords.filter(record => 
      stationIds.includes(record.station_id)
    );
  }
  
  // 再根据收费站筛选
  if (stationFilter && stationFilter.value) {
    const selectedStationId = stationFilter.value;
    filteredRecords = tempFilteredRecords.filter(record => record.station_id === selectedStationId);
  } else {
    filteredRecords = [...tempFilteredRecords];
  }
  
  renderRecords();
}

function renderRecords() {
  const container = document.getElementById('records-table-container')
  
  if (filteredRecords.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无登记记录</p>
      </div>
    `
    return
  }
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>车牌号</th>
          <th>免费原因</th>
          <th>车型</th>
          <th>收费员</th>
          <th>监控员</th>
          <th>收费站</th>
          <th>登记时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filteredRecords.map(record => `
          <tr>
            <td><strong>${record.plate_number || '-'}</strong></td>
            <td>${record.free_reason ? `<span class="badge badge-primary">${record.free_reason}</span>` : '-'}</td>
            <td>${record.vehicle_type || '-'}</td>
            <td>${record.toll_collector || '-'}</td>
            <td>${record.monitor || '-'}</td>
            <td>${record.station_name || '-'}</td>
            <td>${formatDateTime(record.created_at)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="viewRecord('${record.id}')">查看</button>
                ${(currentUser.role === 'super_admin' || currentUser.role === 'company_admin') ? `
                  <button class="btn btn-sm btn-danger" onclick="deleteRecord('${record.id}')">删除</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

function updateStats() {
  const total = allRecords.length
  const today = allRecords.filter(r => isToday(r.created_at)).length
  const month = allRecords.filter(r => isThisMonth(r.created_at)).length
  
  document.getElementById('total-records').textContent = total
  document.getElementById('today-records').textContent = today
  document.getElementById('month-records').textContent = month
}

function searchRecords() {
  const keyword = document.getElementById('search-records').value.toLowerCase()
  
  // 先基于已经应用了日期筛选的allRecords进行关键词搜索
  let tempFilteredRecords = allRecords
  
  if (keyword) {
    tempFilteredRecords = tempFilteredRecords.filter(record => 
      (record.plate_number && record.plate_number.toLowerCase().includes(keyword)) ||
      (record.free_reason && record.free_reason.toLowerCase().includes(keyword)) ||
      (record.toll_collector && record.toll_collector.toLowerCase().includes(keyword)) ||
      (record.monitor && record.monitor.toLowerCase().includes(keyword))
    )
  }
  
  // 再应用收费站筛选
  if (selectedStationId) {
    filteredRecords = tempFilteredRecords.filter(record => record.station_id === selectedStationId)
  } else {
    filteredRecords = [...tempFilteredRecords]
  }
  
  renderRecords()
}

async function deleteRecord(id) {
  if (!confirm('确定要删除这条记录吗？')) return
  
  try {
    const { error } = await window.supabase
      .from('toll_records')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('删除成功', 'success')
    await loadRecords()
    renderRecords()
    updateStats()
  } catch (error) {
    console.error('删除失败:', error)
    showAlert('删除失败', 'error')
  }
}

function viewRecord(id) {
  const record = allRecords.find(r => r.id === id)
  if (!record) return
  
  const modalBody = `
    <div class="form-group">
      <label>车牌号</label>
      <input type="text" value="${record.plate_number || ''}" readonly />
    </div>
    <div class="form-group">
      <label>免费原因</label>
      <input type="text" value="${record.free_reason || ''}" readonly />
    </div>
    <div class="form-group">
      <label>车型</label>
      <input type="text" value="${record.vehicle_type || ''}" readonly />
    </div>
    <div class="form-group">
      <label>轴数</label>
      <input type="text" value="${record.axle_count || ''}" readonly />
    </div>
    <div class="form-group">
      <label>吨位</label>
      <input type="text" value="${record.tonnage || ''}" readonly />
    </div>
    <div class="form-group">
      <label>入口信息</label>
      <input type="text" value="${record.entry_info || ''}" readonly />
    </div>
    <div class="form-group">
      <label>收费员</label>
      <input type="text" value="${record.toll_collector || ''}" readonly />
    </div>
    <div class="form-group">
      <label>监控员</label>
      <input type="text" value="${record.monitor || ''}" readonly />
    </div>
    <div class="form-group">
      <label>金额</label>
      <input type="text" value="${record.amount || 0} 元" readonly />
    </div>
    <div class="form-group">
      <label>登记时间</label>
      <input type="text" value="${formatDateTime(record.created_at)}" readonly />
    </div>
  `
  
  showModal('查看记录详情', modalBody, null)
}

// ==================== 分公司管理 ====================

async function loadCompanies() {
  try {
    console.log('开始加载分公司...')
    
    let query = window.supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    
    // 根据用户角色过滤数据，确保currentUser不为null
    if (currentUser) {
      if (currentUser.role === 'company_admin') {
        // 分公司管理员只能看到自己管理的分公司
        query = query.eq('id', currentUser.company_id)
      } else if (currentUser.role === 'station_admin') {
        // 收费站管理员看不到任何分公司
        allCompanies = []
        return
      }
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('加载分公司错误:', error)
      throw error
    }
    console.log('成功加载分公司数量:', data ? data.length : 0)
    allCompanies = data || []
  } catch (error) {
    console.error('加载分公司失败:', error)
    showAlert(`加载分公司失败: ${error.message || '未知错误'}`, 'error')
  }
}

function renderCompanies() {
  const container = document.getElementById('companies-table-container')
  
  if (allCompanies.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无分公司</p>
      </div>
    `
    return
  }
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>分公司名称</th>
          <th>分公司编码</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${allCompanies.map(company => `
          <tr>
            <td><strong>${company.name}</strong></td>
            <td>${company.code}</td>
            <td>${formatDateTime(company.created_at)}</td>
            <td>
              <div class="action-buttons">
                ${currentUser.role === 'super_admin' ? `
                  <button class="btn btn-sm btn-primary" onclick="editCompany('${company.id}')">编辑</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteCompany('${company.id}')">删除</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

function showAddCompanyModal() {
  const modalBody = `
    <div class="form-group">
      <label>分公司名称 *</label>
      <input type="text" id="company-name" placeholder="请输入分公司名称" />
    </div>
    <div class="form-group">
      <label>分公司编码 *</label>
      <input type="text" id="company-code" placeholder="请输入分公司编码" />
    </div>
  `
  
  showModal('添加分公司', modalBody, addCompany)
}

async function addCompany() {
  const name = document.getElementById('company-name').value.trim()
  const code = document.getElementById('company-code').value.trim()
  
  if (!name || !code) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await window.supabase
      .from('companies')
      .insert([{ name, code }])
    
    if (error) throw error
    
    showAlert('添加成功', 'success')
    closeModal()
    await loadCompanies()
    renderCompanies()
    initFilters()
  } catch (error) {
    console.error('添加失败:', error)
    showAlert('添加失败：' + error.message, 'error')
  }
}

function editCompany(id) {
  const company = allCompanies.find(c => c.id === id)
  if (!company) return
  
  const modalBody = `
    <div class="form-group">
      <label>分公司名称 *</label>
      <input type="text" id="company-name" value="${company.name}" />
    </div>
    <div class="form-group">
      <label>分公司编码 *</label>
      <input type="text" id="company-code" value="${company.code}" />
    </div>
  `
  
  showModal('编辑分公司', modalBody, () => updateCompany(id))
}

async function updateCompany(id) {
  const name = document.getElementById('company-name').value.trim()
  const code = document.getElementById('company-code').value.trim()
  
  if (!name || !code) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await window.supabase
      .from('companies')
      .update({ name, code })
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('更新成功', 'success')
    closeModal()
    await loadCompanies()
    renderCompanies()
    initFilters()
  } catch (error) {
    console.error('更新失败:', error)
    showAlert('更新失败：' + error.message, 'error')
  }
}

async function deleteCompany(id) {
  if (!confirm('删除分公司将同时将其下属收费站的分公司ID设为NULL，确定要删除吗？')) return
  
  try {
    const { error } = await window.supabase
      .from('companies')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('删除成功', 'success')
    await loadCompanies()
    await loadStations()
    renderCompanies()
    renderStations()
    initFilters()
  } catch (error) {
    console.error('删除失败:', error)
    showAlert('删除失败：' + error.message, 'error')
  }
}

// ==================== 收费站管理 ====================

// 旧的loadStations函数已删除，使用新的函数定义

function renderStations() {
  const container = document.getElementById('stations-table-container')
  const companyFilter = document.getElementById('station-company-filter');
  
  // 根据筛选条件过滤收费站
  let filteredStations = allStations;
  
  if (companyFilter && companyFilter.value) {
    const selectedCompanyId = companyFilter.value;
    filteredStations = filteredStations.filter(station => 
      station.company_id === selectedCompanyId
    );
  }
  
  if (filteredStations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无收费站</p>
      </div>
    `
    return
  }
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>收费站名称</th>
          <th>收费站编码</th>
          <th>所属分公司</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filteredStations.map(station => `
          <tr>
            <td><strong>${station.name}</strong></td>
            <td>${station.code}</td>
            <td>${station.company_name || '无'}</td>
            <td>${formatDateTime(station.created_at)}</td>
            <td>
              <div class="action-buttons">
                ${(currentUser.role === 'super_admin' || currentUser.role === 'company_admin') ? `
                  <button class="btn btn-sm btn-primary" onclick="editStation('${station.id}')">编辑</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteStation('${station.id}')">删除</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

function showAddStationModal() {
  const companyOptions = allCompanies.map(c => 
    `<option value="${c.id}">${c.name}</option>`
  ).join('')
  
  const modalBody = `
    <div class="form-group">
      <label>收费站名称 *</label>
      <input type="text" id="station-name" placeholder="请输入收费站名称" />
    </div>
    <div class="form-group">
      <label>收费站编码 *</label>
      <input type="text" id="station-code" placeholder="请输入收费站编码" />
    </div>
    <div class="form-group">
      <label>所属分公司</label>
      <select id="station-company">
        <option value="">无</option>
        ${companyOptions}
      </select>
    </div>
  `
  
  showModal('添加收费站', modalBody, addStation)
}

async function addStation() {
  const name = document.getElementById('station-name').value.trim()
  const code = document.getElementById('station-code').value.trim()
  const companySelect = document.getElementById('station-company')
  const selectedValue = companySelect.value
  
  // 处理分公司ID：如果为空字符串则设置为null，否则保持字符串类型（UUID）
  const companyId = selectedValue === '' ? null : selectedValue
  
  if (!name || !code) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    // 验证分公司ID是否存在（如果不为null）
    if (companyId) {
      const { data: company, error: companyError } = await window.supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single()
      
      if (companyError || !company) {
        throw new Error('选择的分公司不存在')
      }
    }
    
    const { error } = await window.supabase
      .from('toll_stations')
      .insert([{ name, code, company_id: companyId }])
    
    if (error) throw error
    
    showAlert('添加成功', 'success')
    closeModal()
    await loadStations()
    renderStations()
    initFilters()
  } catch (error) {
    console.error('添加失败:', error)
    showAlert('添加失败：' + error.message, 'error')
  }
}

function editStation(id) {
  const station = allStations.find(s => s.id === id)
  if (!station) return
  
  const companyOptions = allCompanies.map(c => 
    `<option value="${c.id}" ${station.company_id === c.id ? 'selected' : ''}>${c.name}</option>`
  ).join('')
  
  const modalBody = `
    <div class="form-group">
      <label>收费站名称 *</label>
      <input type="text" id="station-name" value="${station.name}" />
    </div>
    <div class="form-group">
      <label>收费站编码 *</label>
      <input type="text" id="station-code" value="${station.code}" />
    </div>
    <div class="form-group">
      <label>所属分公司</label>
      <select id="station-company">
        <option value="" ${!station.company_id ? 'selected' : ''}>无</option>
        ${companyOptions}
      </select>
    </div>
  `
  
  showModal('编辑收费站', modalBody, () => updateStation(id))
}

async function updateStation(id) {
  const name = document.getElementById('station-name').value.trim()
  const code = document.getElementById('station-code').value.trim()
  const companySelect = document.getElementById('station-company')
  
  // 获取选中的分公司值
  const selectedValue = companySelect.value
  console.log('=== 更新收费站调试信息 ===')
  console.log('收费站ID:', id)
  console.log('收费站名称:', name)
  console.log('收费站编码:', code)
  console.log('选择的分公司值:', selectedValue)
  
  // 处理分公司ID：如果为空字符串则设置为null
  const companyId = selectedValue === '' ? null : selectedValue
  console.log('最终分公司ID:', companyId)
  
  if (!name || !code) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    console.log('1. 开始更新收费站数据...')
    
    // 使用Supabase更新收费站数据
    const { data: updateData, error: updateError } = await window.supabase
      .from('toll_stations')
      .update({
        name: name,
        code: code,
        company_id: companyId  // 确保正确保存company_id到数据库
      })
      .eq('id', id)
      .select('*')
    
    console.log('2. 更新操作结果:')
    console.log('   返回数据:', updateData)
    console.log('   错误:', updateError)
    
    if (updateError) {
      console.error('更新失败:', updateError)
      showAlert(`更新失败：${updateError.message}`, 'error')
      return
    }
    
    // 验证返回数据
    if (!updateData || updateData.length === 0) {
      console.error('更新后未返回数据')
      showAlert('更新失败：未返回数据', 'error')
      return
    }
    
    console.log('3. 更新成功，获取最新的分公司数据...')
    
    // 重新加载最新的分公司数据
    await loadCompanies()
    
    console.log('4. 重新加载收费站数据...')
    
    // 重新加载最新的收费站数据（包括更新后的）
    await loadStations()
    
    console.log('5. 更新本地缓存...')
    
    // 验证本地缓存中的数据
    const updatedStation = allStations.find(s => s.id === id)
    if (updatedStation) {
      console.log('   更新后的收费站数据:', updatedStation)
      console.log('   分公司ID:', updatedStation.company_id)
      console.log('   分公司名称:', updatedStation.company_name)
    }
    
    // 6. 显示成功信息
    showAlert('更新成功', 'success')
    closeModal()
    
    // 7. 重新渲染表格
    console.log('6. 重新渲染收费站列表...')
    renderStations()
    
    // 8. 重新初始化筛选器
    initFilters()
    
    console.log('=== 更新操作完成 ===')
  } catch (error) {
    console.error('异常错误:', error)
    console.error('错误堆栈:', error.stack)
    showAlert('更新失败：' + error.message, 'error')
  }
}

async function deleteStation(id) {
  if (!confirm('删除收费站将同时删除其下属的所有班组，确定要删除吗？')) return
  
  try {
    const { error } = await window.supabase
      .from('toll_stations')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('删除成功', 'success')
    await loadStations()
    await loadGroups()
    renderStations()
  } catch (error) {
    console.error('删除失败:', error)
    showAlert('删除失败：' + error.message, 'error')
  }
}

// ==================== 班组管理 ====================

async function loadGroups() {
  try {
    let query = window.supabase
      .from('toll_groups')
      .select(`
        *,
        toll_stations (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
    
    // 根据用户角色过滤数据，确保currentUser不为null
    if (currentUser) {
      if (currentUser.role === 'company_admin') {
        // 分公司管理员只能看到自己分公司下收费站的班组
        // 先获取用户分公司下的所有收费站ID
        const companyStations = allStations.map(station => station.id)
        if (companyStations.length > 0) {
          query = query.in('station_id', companyStations)
        } else {
          allGroups = []
          return
        }
      } else if (currentUser.role === 'station_admin') {
        // 收费站管理员只能看到自己收费站下的班组
        query = query.eq('station_id', currentUser.station_id)
      }
    }
    
    const { data, error } = await query
    
    if (error) throw error
    allGroups = data || []
  } catch (error) {
    console.error('加载班组失败:', error)
  }
}

function renderGroups() {
  const container = document.getElementById('groups-table-container')
  const companyFilter = document.getElementById('group-company-filter');
  const stationFilter = document.getElementById('group-station-filter');
  
  // 根据筛选条件过滤班组
  let filteredGroups = allGroups;
  
  // 先根据分公司筛选
  if (companyFilter && companyFilter.value) {
    const selectedCompanyId = companyFilter.value;
    // 找到该分公司下的所有收费站ID
    const stationIds = allStations
      .filter(station => station.company_id === selectedCompanyId)
      .map(station => station.id);
    
    filteredGroups = filteredGroups.filter(group => 
      stationIds.includes(group.station_id)
    );
  }
  
  // 再根据收费站筛选
  if (stationFilter && stationFilter.value) {
    const selectedStationId = stationFilter.value;
    filteredGroups = filteredGroups.filter(group => group.station_id === selectedStationId);
  }
  
  if (filteredGroups.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无班组</p>
      </div>
    `
    return
  }
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>班组名称</th>
          <th>班组编码</th>
          <th>所属收费站</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filteredGroups.map(group => `
          <tr>
            <td><strong>${group.name}</strong></td>
            <td>${group.code}</td>
            <td>${group.toll_stations ? group.toll_stations.name : '-'}</td>
            <td>${formatDateTime(group.created_at)}</td>
            <td>
              <div class="action-buttons">
                ${(currentUser.role === 'super_admin' || currentUser.role === 'company_admin' || currentUser.role === 'station_admin') ? `
                  <button class="btn btn-sm btn-primary" onclick="editGroup('${group.id}')">编辑</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteGroup('${group.id}')">删除</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

function showAddGroupModal() {
  if (allStations.length === 0) {
    showAlert('请先添加收费站', 'error')
    return
  }
  
  const stationOptions = allStations.map(s => 
    `<option value="${s.id}">${s.name}</option>`
  ).join('')
  
  const modalBody = `
    <div class="form-group">
      <label>班组名称 *</label>
      <input type="text" id="group-name" placeholder="请输入班组名称" />
    </div>
    <div class="form-group">
      <label>班组编码 *</label>
      <input type="text" id="group-code" placeholder="请输入班组编码" />
    </div>
    <div class="form-group">
      <label>所属收费站 *</label>
      <select id="group-station">
        <option value="">请选择收费站</option>
        ${stationOptions}
      </select>
    </div>
  `
  
  showModal('添加班组', modalBody, addGroup)
}

async function addGroup() {
  const name = document.getElementById('group-name').value.trim()
  const code = document.getElementById('group-code').value.trim()
  const stationId = document.getElementById('group-station').value
  
  if (!name || !code || !stationId) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await window.supabase
      .from('toll_groups')
      .insert([{ name, code, station_id: stationId }])
    
    if (error) throw error
    
    showAlert('添加成功', 'success')
    closeModal()
    await loadGroups()
    renderGroups()
  } catch (error) {
    console.error('添加失败:', error)
    showAlert('添加失败：' + error.message, 'error')
  }
}

function editGroup(id) {
  const group = allGroups.find(g => g.id === id)
  if (!group) return
  
  const stationOptions = allStations.map(s => 
    `<option value="${s.id}" ${s.id === group.station_id ? 'selected' : ''}>${s.name}</option>`
  ).join('')
  
  const modalBody = `
    <div class="form-group">
      <label>班组名称 *</label>
      <input type="text" id="group-name" value="${group.name}" />
    </div>
    <div class="form-group">
      <label>班组编码 *</label>
      <input type="text" id="group-code" value="${group.code}" />
    </div>
    <div class="form-group">
      <label>所属收费站 *</label>
      <select id="group-station">
        ${stationOptions}
      </select>
    </div>
  `
  
  showModal('编辑班组', modalBody, () => updateGroup(id))
}

async function updateGroup(id) {
  const name = document.getElementById('group-name').value.trim()
  const code = document.getElementById('group-code').value.trim()
  const stationId = document.getElementById('group-station').value
  
  if (!name || !code || !stationId) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await window.supabase
      .from('toll_groups')
      .update({ name, code, station_id: stationId })
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('更新成功', 'success')
    closeModal()
    await loadGroups()
    renderGroups()
  } catch (error) {
    console.error('更新失败:', error)
    showAlert('更新失败：' + error.message, 'error')
  }
}

async function deleteGroup(id) {
  if (!confirm('确定要删除这个班组吗？')) return
  
  try {
    const { error } = await window.supabase
      .from('toll_groups')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('删除成功', 'success')
    await loadGroups()
    renderGroups()
  } catch (error) {
    console.error('删除失败:', error)
    showAlert('删除失败：' + error.message, 'error')
  }
}

// ==================== 收费员管理 ====================

async function loadCollectors() {
  try {
    let query = window.supabase
      .from('toll_collectors_info')
      .select(`
        *,
        toll_groups (
          id,
          name,
          station_id,
          toll_stations (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    // 根据用户角色过滤数据，确保currentUser不为null
    if (currentUser) {
      if (currentUser.role === 'company_admin') {
        // 分公司管理员只能看到自己分公司下的收费员
        // 先获取用户分公司下的所有班组ID
        const companyGroups = allGroups.map(group => group.id)
        if (companyGroups.length > 0) {
          query = query.in('group_id', companyGroups)
        } else {
          allCollectors = []
          return
        }
      } else if (currentUser.role === 'station_admin') {
        // 收费站管理员只能看到自己收费站下的收费员
        // 先获取用户收费站下的所有班组ID
        const stationGroups = allGroups.filter(group => group.station_id === currentUser.station_id)
                                      .map(group => group.id)
        if (stationGroups.length > 0) {
          query = query.in('group_id', stationGroups)
        } else {
          allCollectors = []
          return
        }
      }
    }
    
    const { data, error } = await query
    
    if (error) throw error
    allCollectors = data || []
  } catch (error) {
    console.error('加载收费员失败:', error)
  }
}

function renderCollectors() {
  const container = document.getElementById('collectors-table-container')
  const companyFilter = document.getElementById('collector-company-filter');
  const stationFilter = document.getElementById('collector-station-filter');
  const groupFilter = document.getElementById('collector-group-filter');
  
  // 根据筛选条件过滤收费员
  let filteredCollectors = allCollectors;
  
  // 先根据分公司筛选
  if (companyFilter && companyFilter.value) {
    const selectedCompanyId = companyFilter.value;
    // 找到该分公司下的所有收费站ID
    const stationIds = allStations
      .filter(station => station.company_id === selectedCompanyId)
      .map(station => station.id);
    
    filteredCollectors = filteredCollectors.filter(collector => 
      collector.toll_groups && stationIds.includes(collector.toll_groups.station_id)
    );
  }
  
  // 再根据收费站筛选
  if (stationFilter && stationFilter.value) {
    const selectedStationId = stationFilter.value;
    filteredCollectors = filteredCollectors.filter(collector => 
      collector.toll_groups && collector.toll_groups.station_id === selectedStationId
    );
  }
  
  // 最后根据班组筛选
  if (groupFilter && groupFilter.value) {
    const selectedGroupId = groupFilter.value;
    filteredCollectors = filteredCollectors.filter(collector => 
      collector.group_id === selectedGroupId
    );
  }
  
  if (filteredCollectors.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无收费员</p>
      </div>
    `
    return
  }
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>姓名</th>
          <th>工号</th>
          <th>所属班组</th>
          <th>所属收费站</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filteredCollectors.map(collector => `
          <tr>
            <td><strong>${collector.name}</strong></td>
            <td>${collector.code}</td>
            <td>${collector.toll_groups ? collector.toll_groups.name : '-'}</td>
            <td>${collector.toll_groups && collector.toll_groups.toll_stations ? collector.toll_groups.toll_stations.name : '-'}</td>
            <td>${formatDateTime(collector.created_at)}</td>
            <td>
              <div class="action-buttons">
                ${(currentUser.role === 'super_admin' || currentUser.role === 'company_admin' || currentUser.role === 'station_admin') ? `
                  <button class="btn btn-sm btn-primary" onclick="editCollector('${collector.id}')">编辑</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteCollector('${collector.id}')">删除</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

function showAddCollectorModal() {
  if (allStations.length === 0) {
    showAlert('请先添加收费站', 'error')
    return
  }
  
  const stationOptions = allStations.map(s => 
    `<option value="${s.id}">${s.name}</option>`
  ).join('')
  
  const modalBody = `
    <div class="form-group">
      <label>姓名 *</label>
      <input type="text" id="collector-name" placeholder="请输入姓名" />
    </div>
    <div class="form-group">
      <label>工号 *</label>
      <input type="text" id="collector-code" placeholder="请输入工号" />
    </div>
    <div class="form-group">
      <label>所属收费站 *</label>
      <select id="collector-station" onchange="updateCollectorGroupOptions()">
        <option value="">请选择收费站</option>
        ${stationOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属班组 *</label>
      <select id="collector-group">
        <option value="">请选择班组</option>
      </select>
    </div>
  `
  
  showModal('添加收费员', modalBody, addCollector)
}

async function addCollector() {
  const name = document.getElementById('collector-name').value.trim()
  const code = document.getElementById('collector-code').value.trim()
  const stationId = document.getElementById('collector-station').value
  const groupId = document.getElementById('collector-group').value
  
  if (!name || !code || !stationId || !groupId) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await window.supabase
      .from('toll_collectors_info')
      .insert([{ name, code, group_id: groupId }])
    
    if (error) throw error
    
    showAlert('添加成功', 'success')
    closeModal()
    await loadCollectors()
    renderCollectors()
  } catch (error) {
    console.error('添加失败:', error)
    showAlert('添加失败：' + error.message, 'error')
  }
}

function editCollector(id) {
  const collector = allCollectors.find(c => c.id === id)
  if (!collector) return
  
  // 获取当前收费员的班组信息以确定所属收费站
  const currentGroup = allGroups.find(g => g.id === collector.group_id);
  const currentStationId = currentGroup ? currentGroup.station_id : null;
  
  const stationOptions = allStations.map(s => 
    `<option value="${s.id}" ${s.id === currentStationId ? 'selected' : ''}>${s.name}</option>`
  ).join('')
  
  // 根据当前收费站筛选班组
  const filteredGroups = allGroups.filter(group => 
    !currentStationId || group.station_id === currentStationId
  );
  
  const groupOptions = filteredGroups.map(g => 
    `<option value="${g.id}" ${g.id === collector.group_id ? 'selected' : ''}>${g.name}</option>`
  ).join('')
  
  const modalBody = `
    <div class="form-group">
      <label>姓名 *</label>
      <input type="text" id="collector-name" value="${collector.name}" />
    </div>
    <div class="form-group">
      <label>工号 *</label>
      <input type="text" id="collector-code" value="${collector.code}" />
    </div>
    <div class="form-group">
      <label>所属收费站 *</label>
      <select id="collector-station" onchange="updateCollectorGroupOptions()">
        ${stationOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属班组 *</label>
      <select id="collector-group">
        ${groupOptions}
      </select>
    </div>
  `
  
  showModal('编辑收费员', modalBody, () => updateCollector(id))
}

async function updateCollector(id) {
  const name = document.getElementById('collector-name').value.trim()
  const code = document.getElementById('collector-code').value.trim()
  const groupId = document.getElementById('collector-group').value
  
  if (!name || !code || !groupId) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await window.supabase
      .from('toll_collectors_info')
      .update({ name, code, group_id: groupId })
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('更新成功', 'success')
    closeModal()
    await loadCollectors()
    renderCollectors()
  } catch (error) {
    console.error('更新失败:', error)
    showAlert('更新失败：' + error.message, 'error')
  }
}

async function deleteCollector(id) {
  if (!confirm('确定要删除这个收费员吗？')) return
  
  try {
    const { error } = await window.supabase
      .from('toll_collectors_info')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('删除成功', 'success')
    await loadCollectors()
    renderCollectors()
  } catch (error) {
    console.error('删除失败:', error)
    showAlert('删除失败：' + error.message, 'error')
  }
}

// ==================== 监控员管理 ====================

async function loadMonitors() {
  try {
    let query = window.supabase
      .from('monitors_info')
      .select(`
        *,
        toll_stations (
          id,
          name
        ),
        toll_groups (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
    
    // 根据用户角色过滤数据，确保currentUser不为null
    if (currentUser) {
      if (currentUser.role === 'company_admin') {
        // 分公司管理员只能看到自己分公司下的监控员
        // 先获取用户分公司下的所有收费站ID
        const companyStationIds = allStations.map(station => station.id)
        if (companyStationIds.length > 0) {
          query = query.in('station_id', companyStationIds)
        } else {
          allMonitors = []
          return
        }
      } else if (currentUser.role === 'station_admin') {
        // 收费站管理员只能看到自己收费站下的监控员
        query = query.eq('station_id', currentUser.station_id)
      }
    }
    
    const { data, error } = await query
    
    if (error) throw error
    allMonitors = data || []
  } catch (error) {
    console.error('加载监控员失败:', error)
  }
}

function renderMonitors() {
  const container = document.getElementById('monitors-table-container')
  const companyFilter = document.getElementById('monitor-company-filter');
  const stationFilter = document.getElementById('monitor-station-filter');
  const groupFilter = document.getElementById('monitor-group-filter');
  
  // 根据筛选条件过滤监控员
  let filteredMonitors = allMonitors;
  
  // 先根据分公司筛选
  if (companyFilter && companyFilter.value) {
    const selectedCompanyId = companyFilter.value;
    // 找到该分公司下的所有收费站ID
    const stationIds = allStations
      .filter(station => station.company_id === selectedCompanyId)
      .map(station => station.id);
    
    filteredMonitors = filteredMonitors.filter(monitor => 
      monitor.toll_stations && stationIds.includes(monitor.toll_stations.id)
    );
  }
  
  // 再根据收费站筛选
  if (stationFilter && stationFilter.value) {
    const selectedStationId = stationFilter.value;
    filteredMonitors = filteredMonitors.filter(monitor => 
      monitor.toll_stations && monitor.toll_stations.id === selectedStationId
    );
  }
  
  // 最后根据班组筛选
  if (groupFilter && groupFilter.value) {
    const selectedGroupId = groupFilter.value;
    filteredMonitors = filteredMonitors.filter(monitor => 
      monitor.toll_groups && monitor.toll_groups.id === selectedGroupId
    );
  }
  
  if (filteredMonitors.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无监控员</p>
      </div>
    `
    return
  }
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>姓名</th>
          <th>工号</th>
          <th>所属收费站</th>
          <th>所属班组</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filteredMonitors.map(monitor => `
          <tr>
            <td><strong>${monitor.name}</strong></td>
            <td>${monitor.code}</td>
            <td>${monitor.toll_stations ? monitor.toll_stations.name : '-'}</td>
            <td>${monitor.toll_groups ? monitor.toll_groups.name : '-'}</td>
            <td>${formatDateTime(monitor.created_at)}</td>
            <td>
              <div class="action-buttons">
                ${(currentUser.role === 'super_admin' || currentUser.role === 'company_admin' || currentUser.role === 'station_admin') ? `
                  <button class="btn btn-sm btn-primary" onclick="editMonitor('${monitor.id}')">编辑</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteMonitor('${monitor.id}')">删除</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

function showAddMonitorModal() {
  if (allStations.length === 0) {
    showAlert('请先添加收费站', 'error')
    return
  }
  
  const stationOptions = allStations.map(s => 
    `<option value="${s.id}">${s.name}</option>`
  ).join('')
  
  const modalBody = `
    <div class="form-group">
      <label>姓名 *</label>
      <input type="text" id="monitor-name" placeholder="请输入姓名" />
    </div>
    <div class="form-group">
      <label>工号 *</label>
      <input type="text" id="monitor-code" placeholder="请输入工号" />
    </div>
    <div class="form-group">
      <label>所属收费站 *</label>
      <select id="monitor-station" onchange="updateMonitorGroupOptions()">
        <option value="">请选择收费站</option>
        ${stationOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属班组</label>
      <select id="monitor-group">
        <option value="">请选择班组</option>
      </select>
    </div>
  `
  
  showModal('添加监控员', modalBody, addMonitor)
}

async function addMonitor() {
  const name = document.getElementById('monitor-name').value.trim()
  const code = document.getElementById('monitor-code').value.trim()
  const stationId = document.getElementById('monitor-station').value
  const groupId = document.getElementById('monitor-group').value
  
  if (!name || !code || !stationId) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await window.supabase
      .from('monitors_info')
      .insert([{ name, code, station_id: stationId, group_id: groupId }])
    
    if (error) throw error
    
    showAlert('添加成功', 'success')
    closeModal()
    await loadMonitors()
    renderMonitors()
  } catch (error) {
    console.error('添加失败:', error)
    showAlert('添加失败：' + error.message, 'error')
  }
}

function editMonitor(id) {
  const monitor = allMonitors.find(m => m.id === id)
  if (!monitor) return
  
  const stationOptions = allStations.map(s => 
    `<option value="${s.id}" ${s.id === monitor.station_id ? 'selected' : ''}>${s.name}</option>`
  ).join('')
  
  // 根据当前收费站筛选班组
  const filteredGroups = allGroups.filter(group => 
    !monitor.station_id || group.station_id === monitor.station_id
  );
  
  const groupOptions = filteredGroups.map(g => 
    `<option value="${g.id}" ${g.id === monitor.group_id ? 'selected' : ''}>${g.name}</option>`
  ).join('')
  
  const modalBody = `
    <div class="form-group">
      <label>姓名 *</label>
      <input type="text" id="monitor-name" value="${monitor.name}" />
    </div>
    <div class="form-group">
      <label>工号 *</label>
      <input type="text" id="monitor-code" value="${monitor.code}" />
    </div>
    <div class="form-group">
      <label>所属收费站 *</label>
      <select id="monitor-station" onchange="updateMonitorGroupOptions()">
        ${stationOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属班组</label>
      <select id="monitor-group">
        <option value="">请选择班组</option>
        ${groupOptions}
      </select>
    </div>
  `
  
  showModal('编辑监控员', modalBody, () => updateMonitor(id))
}

async function updateMonitor(id) {
  const name = document.getElementById('monitor-name').value.trim()
  const code = document.getElementById('monitor-code').value.trim()
  const stationId = document.getElementById('monitor-station').value
  const groupId = document.getElementById('monitor-group').value
  
  if (!name || !code || !stationId) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await window.supabase
      .from('monitors_info')
      .update({ name, code, station_id: stationId, group_id: groupId })
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('更新成功', 'success')
    closeModal()
    await loadMonitors()
    renderMonitors()
  } catch (error) {
    console.error('更新失败:', error)
    showAlert('更新失败：' + error.message, 'error')
  }
}

async function deleteMonitor(id) {
  if (!confirm('确定要删除这个监控员吗？')) return
  
  try {
    const { error } = await window.supabase
      .from('monitors_info')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('删除成功', 'success')
    await loadMonitors()
    renderMonitors()
  } catch (error) {
    console.error('删除失败:', error)
    showAlert('删除失败：' + error.message, 'error')
  }
}

// ==================== 班次设置 ====================

async function loadShifts() {
  try {
    const { data, error } = await window.supabase
      .from('shift_settings')
      .select('*')
      .order('shift_name')
    
    if (error) throw error
    allShifts = data || []
  } catch (error) {
    console.error('加载班次设置失败:', error)
  }
}

function renderShifts() {
  const container = document.getElementById('shifts-table-container')
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>班次名称</th>
          <th>开始时间</th>
          <th>结束时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${allShifts.map(shift => `
          <tr>
            <td><strong>${shift.shift_name}</strong></td>
            <td>${shift.start_time}</td>
            <td>${shift.end_time}</td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="editShift('${shift.id}')">编辑</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

function editShift(id) {
  const shift = allShifts.find(s => s.id === id)
  if (!shift) return
  
  const modalBody = `
    <div class="form-group">
      <label>班次名称</label>
      <input type="text" value="${shift.shift_name}" readonly />
    </div>
    <div class="form-group">
      <label>开始时间 *</label>
      <input type="time" id="shift-start" value="${shift.start_time}" />
    </div>
    <div class="form-group">
      <label>结束时间 *</label>
      <input type="time" id="shift-end" value="${shift.end_time}" />
    </div>
  `
  
  showModal('编辑班次时间', modalBody, () => updateShift(id))
}

async function updateShift(id) {
  const startTime = document.getElementById('shift-start').value
  const endTime = document.getElementById('shift-end').value
  
  if (!startTime || !endTime) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await window.supabase
      .from('shift_settings')
      .update({ start_time: startTime, end_time: endTime })
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('更新成功', 'success')
    closeModal()
    await loadShifts()
    renderShifts()
  } catch (error) {
    console.error('更新失败:', error)
    showAlert('更新失败：' + error.message, 'error')
  }
}

// ==================== 导出功能 ====================

function exportToExcel() {
  if (filteredRecords.length === 0) {
    showAlert('暂无数据可导出', 'error')
    return
  }
  
  // 处理入口信息，移除()及其中内容
  const processEntryInfo = (entryInfo) => {
    if (!entryInfo) return '';
    // 移除括号及其中的内容
    return entryInfo.replace(/\([^)]*\)/g, '').trim();
  };
  
  const data = filteredRecords.map(record => ({
    '车牌号': record.plate_number || '',
    '免费原因': record.free_reason || '',
    '车型': record.vehicle_type || '',
    '轴数': record.axle_count || '',
    '吨位': record.tonnage || '',
    '入口信息': processEntryInfo(record.entry_info),
    '收费员': record.toll_collector || '',
    '监控员': record.monitor || '',
    '收费站': record.station_name || '',
    '金额': record.amount || 0,
    '登记时间': formatDateTime(record.created_at)
  }))
  
  const ws = XLSX.utils.json_to_sheet(data)
  
  // 设置列宽自适应
  const wscols = [
    { wch: 12 }, // 车牌号
    { wch: 15 }, // 免费原因
    { wch: 10 }, // 车型
    { wch: 8 },  // 轴数
    { wch: 8 },  // 吨位
    { wch: 15 }, // 入口信息
    { wch: 12 }, // 收费员
    { wch: 12 }, // 监控员
    { wch: 12 }, // 收费站
    { wch: 10 }, // 金额
    { wch: 20 }  // 登记时间
  ];
  ws['!cols'] = wscols;
  
  // 设置内容居中
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = { c: C, r: R };
      const cell_ref = XLSX.utils.encode_cell(cell_address);
      if (!ws[cell_ref]) continue;
      // 设置对齐方式为居中
      ws[cell_ref].s = {
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        }
      };
    }
  }
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '登记记录')
  
  const filename = `免费车登记记录_${formatDate(new Date())}.xlsx`
  XLSX.writeFile(wb, filename)
  
  showAlert('导出成功', 'success')
}

// ==================== 工具函数 ====================

function showModal(title, body, onSubmit, cancelText = '取消') {
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-body').innerHTML = body
  document.getElementById('modal').classList.add('active')
  
  const submitBtn = document.getElementById('modal-submit')
  submitBtn.onclick = onSubmit
  submitBtn.style.display = onSubmit ? 'block' : 'none'
  
  // 修改取消按钮文本
  const cancelBtn = document.querySelector('.modal-footer .btn-secondary')
  cancelBtn.textContent = cancelText
  cancelBtn.onclick = closeModal
}

function closeModal() {
  document.getElementById('modal').classList.remove('active')
}

function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div')
  alertDiv.className = `alert alert-${type}`
  alertDiv.textContent = message
  
  document.querySelector('.content-area').insertBefore(alertDiv, document.querySelector('.content-area').firstChild)
  
  setTimeout(() => {
    alertDiv.remove()
  }, 3000)
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function isToday(dateStr) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isThisMonth(dateStr) {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const today = new Date()
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
}

// 点击模态框外部关闭
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') {
    closeModal()
  }
})

// ==================== 用户管理 ====================

// 渲染用户列表
function renderUsers() {
  const container = document.getElementById('users-table-container')
  
  console.log('=== 开始渲染用户列表 ===')
  console.log('当前用户:', currentUser)
  console.log('所有用户:', allUsers)
  
  // 根据当前用户角色过滤用户列表
  let filteredUsers = allUsers;
  
  // 角色权限级别: super_admin > company_admin > station_admin
  const roleHierarchy = {
    'super_admin': 3,
    'company_admin': 2,
    'station_admin': 1
  };
  
  // 确保currentUser不为null
  if (!currentUser) {
    console.error('renderUsers: currentUser is null');
    return;
  }
  
  // 当前用户的权限级别
  const currentUserLevel = roleHierarchy[currentUser.role] || 0;
  
  console.log('当前用户角色:', currentUser.role, '权限级别:', currentUserLevel)
  
  // 超级严格过滤规则: 低级用户完全看不到高级用户，只能看到更低级别的用户
  filteredUsers = allUsers.filter(user => {
    const userLevel = roleHierarchy[user.role] || 0;
    console.log('检查用户:', user.username, '角色:', user.role, '权限级别:', userLevel)
    
    // 只有超级管理员能看到所有用户
    if (currentUser.role === 'super_admin') {
      console.log('超级管理员可以看到所有用户，允许显示:', user.username)
      return true;
    }
    // 分公司管理员只能看到收费站管理员
    else if (currentUser.role === 'company_admin') {
      const canSee = user.role === 'station_admin';
      console.log('分公司管理员检查:', user.username, '可以看到:', canSee)
      return canSee;
    }
    // 收费站管理员看不到任何其他用户
    else {
      console.log('收费站管理员看不到任何用户，允许显示:', false)
      return false;
    }
  });
  
  console.log('过滤后的用户列表:', filteredUsers)
  console.log('=== 渲染用户列表结束 ===')
  
  if (filteredUsers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无用户</p>
      </div>
    `
    return
  }
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>用户名</th>
          <th>角色</th>
          <th>所属分公司</th>
          <th>所属收费站</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filteredUsers.map(user => `
          <tr>
            <td><strong>${user.username}</strong></td>
            <td>${getRoleName(user.role)}</td>
            <td>${user.companies ? user.companies.name : '无'}</td>
            <td>${user.toll_stations ? user.toll_stations.name : '无'}</td>
            <td>${formatDateTime(user.created_at)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">删除</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

// 显示添加用户模态框
function showAddUserModal() {
  // 确保currentUser不为null
  if (!currentUser) {
    console.error('showAddUserModal: currentUser is null');
    return;
  }
  
  // 生成分公司选项
  const companyOptions = allCompanies.map(c => 
    `<option value="${c.id}">${c.name}</option>`
  ).join('')
  
  // 生成收费站选项
  const stationOptions = allStations.map(s => 
    `<option value="${s.id}">${s.name}</option>`
  ).join('')
  
  // 根据当前用户角色生成可用的角色选项
  let roleOptions = '';
  let canAddUsers = false;
  
  // 角色权限级别: super_admin > company_admin > station_admin
  // 超级严格限制：低级用户完全看不到高级角色选项
  switch(currentUser.role) {
    case 'super_admin':
      // 超级管理员可以添加所有角色
      roleOptions = `
        <option value="super_admin">超级管理员</option>
        <option value="company_admin">分公司管理员</option>
        <option value="station_admin">收费站管理员</option>
      `;
      canAddUsers = true;
      break;
    case 'company_admin':
      // 分公司管理员只能添加更低级别的角色（收费站管理员），完全看不到高级角色选项
      roleOptions = `
        <option value="station_admin">收费站管理员</option>
      `;
      canAddUsers = true;
      break;
    case 'station_admin':
      // 收费站管理员是最低级别，不能添加任何角色
      roleOptions = '';
      canAddUsers = false;
      break;
    default:
      roleOptions = '';
      canAddUsers = false;
      break;
  }
  
  // 如果不能添加用户，显示提示
  if (!canAddUsers) {
    showAlert('您没有权限添加用户', 'error');
    return;
  }
  
  const modalBody = `
    <div class="form-group">
      <label>用户名 *</label>
      <input type="text" id="user-username" placeholder="请输入用户名" />
    </div>
    <div class="form-group">
      <label>密码 *</label>
      <input type="password" id="user-password" placeholder="请输入密码" />
    </div>
    <div class="form-group">
      <label>角色 *</label>
      <select id="user-role">
        ${roleOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属分公司</label>
      <select id="user-company">
        <option value="">无</option>
        ${companyOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属收费站</label>
      <select id="user-station">
        <option value="">无</option>
        ${stationOptions}
      </select>
    </div>
  `
  
  showModal('添加用户', modalBody, addUser)
}

// 添加用户
async function addUser() {
  const username = document.getElementById('user-username').value.trim()
  const password = document.getElementById('user-password').value.trim()
  const role = document.getElementById('user-role').value
  const companyId = document.getElementById('user-company').value || null
  const stationId = document.getElementById('user-station').value || null
  
  if (!username || !password || !role) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  // 严格的角色权限检查
  const roleHierarchy = {
    'super_admin': 3,
    'company_admin': 2,
    'station_admin': 1
  };
  
  // 确保currentUser不为null
  if (!currentUser) {
    console.error('addUser: currentUser is null');
    return;
  }
  
  const currentUserLevel = roleHierarchy[currentUser.role] || 0;
  const newUserLevel = roleHierarchy[role] || 0;
  
  // 检查是否有权限添加该角色
  switch(currentUser.role) {
    case 'super_admin':
      // 超级管理员可以添加所有角色
      break;
    case 'company_admin':
      // 分公司管理员只能添加更低级别的角色（收费站管理员）
      if (newUserLevel !== 1) {
        showAlert('您只能添加收费站管理员角色', 'error');
        return;
      }
      break;
    case 'station_admin':
      // 收费站管理员不能添加任何角色
      showAlert('您没有权限添加用户', 'error');
      return;
    default:
      showAlert('您没有权限添加用户', 'error');
      return;
  }
  
  try {
    const { error } = await window.supabase
      .from('admin_users')
      .insert([{
        username,
        password,
        role,
        company_id: companyId,
        station_id: stationId
      }])
    
    if (error) throw error
    
    showAlert('添加成功', 'success')
    closeModal()
    await loadUsers()
    renderUsers()
  } catch (error) {
    console.error('添加用户失败:', error)
    showAlert('添加失败：' + error.message, 'error')
  }
}

// 编辑用户
function editUser(id) {
  const user = allUsers.find(u => u.id === id)
  if (!user) return
  
  // 角色权限级别: super_admin > company_admin > station_admin
  const roleHierarchy = {
    'super_admin': 3,
    'company_admin': 2,
    'station_admin': 1
  };
  
  // 当前用户的权限级别
  const currentUserLevel = roleHierarchy[currentUser.role] || 0;
  // 被编辑用户的权限级别
  const targetUserLevel = roleHierarchy[user.role] || 0;
  
  // 检查权限：只能编辑权限级别低于或等于自己的用户
  if (targetUserLevel > currentUserLevel) {
    showAlert('您没有权限编辑该用户', 'error');
    return;
  }
  
  // 生成分公司选项
  const companyOptions = allCompanies.map(c => 
    `<option value="${c.id}" ${user.company_id === c.id ? 'selected' : ''}>${c.name}</option>`
  ).join('')
  
  // 生成收费站选项
  const stationOptions = allStations.map(s => 
    `<option value="${s.id}" ${user.station_id === s.id ? 'selected' : ''}>${s.name}</option>`
  ).join('')
  
  // 根据当前用户角色生成可用的角色选项
  let roleOptions = '';
  
  // 超级严格限制：只能编辑为更低或相同级别的角色，不能升级角色，且完全看不到高级角色选项
  switch(currentUser.role) {
    case 'super_admin':
      // 超级管理员可以编辑所有角色，但不能将低级角色升级为高级角色
      if (user.role === 'super_admin') {
        roleOptions = `
          <option value="super_admin" selected>超级管理员</option>
        `;
      } else if (user.role === 'company_admin') {
        roleOptions = `
          <option value="company_admin" selected>分公司管理员</option>
          <option value="station_admin">收费站管理员</option>
        `;
      } else {
        roleOptions = `
          <option value="station_admin" selected>收费站管理员</option>
        `;
      }
      break;
    case 'company_admin':
      // 分公司管理员只能编辑更低或相同级别的角色，完全看不到高级角色选项
      if (user.role === 'company_admin') {
        // 分公司管理员可以将自己降级为收费站管理员，但不能升级
        roleOptions = `
          <option value="company_admin" selected>分公司管理员</option>
          <option value="station_admin">收费站管理员</option>
        `;
      } else if (user.role === 'station_admin') {
        // 只能编辑收费站管理员，不能升级
        roleOptions = `
          <option value="station_admin" selected>收费站管理员</option>
        `;
      }
      break;
    case 'station_admin':
      // 收费站管理员只能编辑相同级别的角色，完全看不到高级角色选项
      roleOptions = `
        <option value="station_admin" selected>收费站管理员</option>
      `;
      break;
  }
  
  const modalBody = `
    <div class="form-group">
      <label>用户名</label>
      <input type="text" id="user-username" value="${user.username}" readonly />
    </div>
    <div class="form-group">
      <label>密码（留空则不修改）</label>
      <input type="password" id="user-password" placeholder="请输入密码" />
    </div>
    <div class="form-group">
      <label>角色 *</label>
      <select id="user-role">
        ${roleOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属分公司</label>
      <select id="user-company">
        <option value="" ${!user.company_id ? 'selected' : ''}>无</option>
        ${companyOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属收费站</label>
      <select id="user-station">
        <option value="" ${!user.station_id ? 'selected' : ''}>无</option>
        ${stationOptions}
      </select>
    </div>
  `
  
  showModal('编辑用户', modalBody, () => updateUser(id))
}

// 更新用户
async function updateUser(id) {
  const username = document.getElementById('user-username').value.trim()
  const password = document.getElementById('user-password').value.trim()
  const role = document.getElementById('user-role').value
  const companyId = document.getElementById('user-company').value || null
  const stationId = document.getElementById('user-station').value || null
  
  // 构建更新对象
  const updateData = {
    role,
    company_id: companyId,
    station_id: stationId
  }
  
  // 如果密码不为空，则更新密码
  if (password) {
    updateData.password = password
  }
  
  try {
    const { error } = await window.supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('更新成功', 'success')
    closeModal()
    await loadUsers()
    renderUsers()
  } catch (error) {
    console.error('更新用户失败:', error)
    showAlert('更新失败：' + error.message, 'error')
  }
}

// 删除用户
async function deleteUser(id) {
  const user = allUsers.find(u => u.id === id)
  if (!user) return
  
  // 角色权限级别: super_admin > company_admin > station_admin
  const roleHierarchy = {
    'super_admin': 3,
    'company_admin': 2,
    'station_admin': 1
  };
  
  // 当前用户的权限级别
  const currentUserLevel = roleHierarchy[currentUser.role] || 0;
  // 被删除用户的权限级别
  const targetUserLevel = roleHierarchy[user.role] || 0;
  
  // 检查权限：只能删除权限级别低于或等于自己的用户
  if (targetUserLevel > currentUserLevel) {
    showAlert('您没有权限删除该用户', 'error');
    return;
  }
  
  // 不能删除自己
  if (user.id === currentUser.id) {
    showAlert('不能删除自己', 'error');
    return;
  }
  
  if (!confirm('确定要删除这个用户吗？')) return
  
  try {
    const { error } = await window.supabase
      .from('admin_users')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('删除成功', 'success')
    await loadUsers()
    renderUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    showAlert('删除失败：' + error.message, 'error')
  }
}
