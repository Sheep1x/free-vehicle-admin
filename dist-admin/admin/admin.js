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
let loadedTabs = new Set()

// 分页相关全局变量
let currentPage = 1
let pageSize = 20
let pageCounts = {}

// 登录和初始化逻辑已移至 auth.js

// showMainApp, getRoleName, setUserPermissions, handleLogout 已移至 auth.js

// 初始化筛选器
async function initFilters() {
  const companyFilters = [
    document.getElementById('group-company-filter'),
    document.getElementById('collector-company-filter'),
    document.getElementById('monitor-company-filter'),
    document.getElementById('station-company-filter'),
    document.getElementById('record-company-filter')
  ].filter(Boolean);

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
  
  if (typeof initRecordsFilters === 'function') initRecordsFilters();
  if (typeof initGroupsFilters === 'function') initGroupsFilters();
  if (typeof initCollectorsFilters === 'function') initCollectorsFilters();
  if (typeof initMonitorsFilters === 'function') initMonitorsFilters();
  const stationCompanyFilter = document.getElementById('station-company-filter');
  if(stationCompanyFilter) {
    stationCompanyFilter.addEventListener('change', renderStations);
  }
}

// 加载核心初始数据 (用于筛选器)
async function loadInitialData() {
  try {
    // 1. 先加载核心数据（基础数据）
    await loadCompanies();
    
    // 2. 并行加载其他依赖数据
    await Promise.all([
      loadStations(),
      loadShifts()
    ]);
    
    // 3. 并行加载依赖于stations的数据
    await Promise.all([
      loadGroups(),
      loadMonitors()
    ]);
    
    // 4. 加载收费员数据
    await loadCollectors();
    
    // 5. 构建收费员到收费站的映射表（优化性能）
    if (typeof buildCollectorToStationMap === 'function') {
      buildCollectorToStationMap();
    }
    
    // 6. 重新渲染当前标签页并初始化筛选器
    renderCurrentTab();
    initFilters();
    
    // 7. 延迟加载非关键数据（记录数据）
    setTimeout(async () => {
      await loadRecords();
      if (currentTab === 'records') {
        renderRecords();
        updateStats();
      }
    }, 100);
    
  } catch (error) {
    console.error('加载初始数据失败:', error);
  }
}

// loadUsers, initAdminUsers 已移至 users.js

// 切换标签页
async function switchTab(event, tabName) {
  currentTab = tabName

  try {
    if (!loadedTabs.has(tabName)) {
      const containerId = `${tabName}-table-container`;
      const container = document.getElementById(containerId);
      if(container) {
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';
      }

      switch(tabName) {
          case 'companies': await loadCompanies(); break;
          case 'stations': await loadStations(); break;
          case 'groups': await loadGroups(); break;
          case 'collectors': await loadCollectors(); break;
          case 'monitors': await loadMonitors(); break;
          case 'shifts': await loadShifts(); break;
          case 'users': await loadUsers(); break;
          default: break;
      }
      loadedTabs.add(tabName);
    }

    const allMenuItems = document.querySelectorAll('.menu-item');
    allMenuItems.forEach(item => {
      item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
      content.classList.remove('active');
    });
    const targetTab = document.getElementById(`${tabName}-tab`);
    if(targetTab) {
      targetTab.classList.add('active');
    }
    
    renderCurrentTab()
  } catch (error) {
    console.error('切换标签页失败:', error);
  }
}

async function changePage(newPage) {
  pageCounts[currentTab] = newPage;
  currentPage = newPage;
  
  if (currentTab === 'records') {
    const container = document.getElementById('records-table-container');
    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>正在加载数据...</p>
      </div>
    `;
    
    try {
      const pagination = { page: currentPage, pageSize };
      await loadRecords(pagination);
      renderRecords(pagination);
      await updateStats();
    } catch (error) {
      console.error('切换分页失败:', error);
      showAlert(`切换分页失败: ${error.message || '未知错误'}`, 'error');
    }
  } else {
    renderCurrentTab();
  }
}

function renderCurrentTab() {
  currentPage = pageCounts[currentTab] || 1;
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
