// Supabase 配置
// const SUPABASE_URL = '...' // 这两行已移至 admin/config.js
// const SUPABASE_ANON_KEY = '...' // 请确保 config.js 已正确配置并被 .gitignore 忽略

// 初始化 Supabase 客户端
if (typeof window !== 'undefined') {
  // 只使用真实的Supabase客户端，不使用模拟客户端
  try {
    // 从window.ADMIN_CONFIG获取Supabase配置
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ADMIN_CONFIG || {};
    
    // 检查UMD版本的Supabase库是否已挂载到window对象上
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
      window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    // 检查全局Supabase对象（大写S）
    else if (typeof window.Supabase !== 'undefined' && typeof window.Supabase.createClient === 'function') {
      window.supabase = window.Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    // 检查直接的createClient函数是否可用
    else if (typeof createClient === 'function') {
      window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    // 检查是否已经有可用的supabase客户端
    else if (typeof window.supabase === 'undefined') {
      throw new Error('无法找到可用的Supabase createClient函数');
    }
    
    // 验证客户端功能
    if (typeof window.supabase.from !== 'function') {
      throw new Error('初始化的Supabase客户端没有from方法');
    }
    
  } catch (error) {
    console.error('Supabase客户端初始化失败:', error);
    window.supabase = null;
  }
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
let loadedTabs = new Set() // 用于跟踪已加载的标签页

// 分页相关全局变量
let currentPage = 1
let pageSize = 20
let pageCounts = {} // 存储每个标签页的分页状态

// 登录和初始化逻辑已移至 auth.js

// showMainApp, getRoleName, setUserPermissions, handleLogout 已移至 auth.js

// 初始化筛选器
async function initFilters() {
  // This function is now fully refactored.
  // It populates the main company filters and then calls
  // the specific init functions for each module.

  // Common company filters
  const companyFilters = [
    document.getElementById('group-company-filter'),
    document.getElementById('collector-company-filter'),
    document.getElementById('monitor-company-filter'),
    document.getElementById('station-company-filter'),
    document.getElementById('record-company-filter')
  ].filter(Boolean); // Filter out nulls if some tabs are hidden

  // Populate company options
  if (companyFilters.length > 0 && allCompanies.length > 0) {
    companyFilters.forEach(filter => {
      filter.innerHTML = '<option value="">所有分公司</option>';
      allCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        filter.appendChild(option);
      });
    });
  }
  
  // Initialize filters for each module
  if (typeof initRecordsFilters === 'function') initRecordsFilters();
  if (typeof initGroupsFilters === 'function') initGroupsFilters();
  if (typeof initCollectorsFilters === 'function') initCollectorsFilters();
  if (typeof initMonitorsFilters === 'function') initMonitorsFilters();
  // Stations tab does not have complex dependent filters, only a company filter.
  const stationCompanyFilter = document.getElementById('station-company-filter');
  if(stationCompanyFilter) {
    stationCompanyFilter.addEventListener('change', renderStations);
  }
  
  // 班组管理页面的事件监听器已经在initGroupsFilters函数中定义，无需重复添加
  // 确保所有筛选器初始化函数都被正确调用
}

// 加载核心初始数据 (用于筛选器)
async function loadInitialData() {
  try {
    console.log('开始加载初始数据...');
    showGlobalLoader('正在加载数据...');

    // 1. 先加载核心数据（基础数据）
    await loadCompanies();

    // 2. 加载收费站数据
    await loadStations();

    // 3. 加载班组数据
    await loadGroups();

    // 4. 加载收费员数据（records需要依赖）
    await loadCollectors();

    // 5. 加载监控员数据
    await loadMonitors();

    // 6. 加载班次数据
    await loadShifts();

    // 7. 加载用户数据
    await loadUsers();

    // 8. 初始化筛选器
    initFilters();

    // 9. 加载记录数据（此时所有依赖数据都已加载完成）
    console.log('开始加载登记记录...');
    await loadRecords();

    // 10. 标记所有标签页为已加载
    loadedTabs.add('records');
    loadedTabs.add('companies');
    loadedTabs.add('stations');
    loadedTabs.add('groups');
    loadedTabs.add('collectors');
    loadedTabs.add('monitors');
    loadedTabs.add('shifts');
    loadedTabs.add('users');

    // 11. 渲染当前标签页
    renderCurrentTab();

    // 12. 确保默认标签页（records）的菜单按钮和内容区域正确显示
    const recordsMenuItem = document.querySelector('.menu-item[onclick*="records"]');
    const recordsTab = document.getElementById('records-tab');
    if (recordsMenuItem) {
      recordsMenuItem.classList.add('active');
    }
    if (recordsTab) {
      recordsTab.classList.add('active');
    }

    console.log('初始数据加载完成');
    hideGlobalLoader();
  } catch (error) {
    console.error('加载初始数据失败:', error);
    hideGlobalLoader();
    showAlert('加载数据失败，请刷新页面重试', 'error');
  }
}

// loadUsers, initAdminUsers 已移至 users.js

// 切换标签页
async function switchTab(event, tabName) {
  currentTab = tabName

  try {
    // 如果标签页数据尚未加载，则加载它
    if (!loadedTabs.has(tabName)) {
      // 显示加载指示器
      const containerId = `${tabName}-table-container`;
      const container = document.getElementById(containerId);
      if(container) {
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';
      }

      // 加载对应标签页的数据
      switch(tabName) {
          case 'companies': await loadCompanies(); break;
          case 'stations': await loadStations(); break;
          case 'groups': await loadGroups(); break;
          case 'collectors': await loadCollectors(); break;
          case 'monitors': await loadMonitors(); break;
          case 'shifts': await loadShifts(); break;
          case 'users': await loadUsers(); break;
          // records 已经默认加载
          default: break;
      }
      loadedTabs.add(tabName);
    }

    // 更新菜单按钮状态
    const allMenuItems = document.querySelectorAll('.menu-item');
    allMenuItems.forEach(item => {
      item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // 更新标签页内容显示
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
      content.classList.remove('active');
    });
    const targetTab = document.getElementById(`${tabName}-tab`);
    if(targetTab) {
      targetTab.classList.add('active');
    }
    
    // 渲染当前标签页内容
    renderCurrentTab()
  } catch (error) {
    console.error('切换标签页失败:', error);
  }
}

// 分页切换函数
function changePage(newPage) {
  // 保存当前标签页的分页状态
  pageCounts[currentTab] = newPage;
  currentPage = newPage;
  // 重新渲染当前标签页
  renderCurrentTab();
}

// 渲染当前标签页
function renderCurrentTab() {
  // 获取当前标签页的分页状态，默认为第1页
  currentPage = pageCounts[currentTab] || 1;
  
  // 渲染时传递分页参数
  const pagination = { page: currentPage, pageSize };
  
  switch(currentTab) {
    case 'records':
      renderRecords(pagination)
      updateStats()
      break
    case 'companies':
      renderCompanies(pagination)
      break
    case 'stations':
      renderStations(pagination)
      break
    case 'groups':
      renderGroups(pagination)
      break
    case 'collectors':
      renderCollectors(pagination)
      break
    case 'monitors':
      renderMonitors(pagination)
      break
    case 'shifts':
      renderShifts(pagination)
      break
    case 'users':
      renderUsers(pagination)
      break
  }
}

// ==================== ALL MODULES MOVED ====================
// 记录管理相关函数已移至 records.js
// 分公司管理模块已移至 companies.js
// 收费站管理模块已移至 stations.js
// 班组管理模块已移至 groups.js
// 收费员管理模块已移至 collectors.js
// 监控员管理模块已移至 monitors.js
// 班次设置模块已移至 shifts.js
// 导出功能模块已移至 records.js
// 工具函数已移至 utils.js
// User management module has been moved to users.js