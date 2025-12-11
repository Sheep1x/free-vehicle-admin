// Supabase 配置
const SUPABASE_URL = 'https://backend.appmiaoda.com/projects/supabase257114593363537920' // 需要替换
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDgwNzI4MDk2LCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.Wxk0iRphJzRVuqWgIZVGYL9SsC0-7JDabv4xfGAhcNw' // 需要替换

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 全局变量
let currentTab = 'records'
let allRecords = []
let allStations = []
let allGroups = []
let allCollectors = []
let allMonitors = []
let allShifts = []

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData()
  renderCurrentTab()
})

// 加载所有数据
async function loadAllData() {
  await Promise.all([
    loadRecords(),
    loadStations(),
    loadGroups(),
    loadCollectors(),
    loadMonitors(),
    loadShifts()
  ])
}

// 切换标签页
function switchTab(tabName) {
  currentTab = tabName
  
  // 更新标签样式
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'))
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
  }
}

// ==================== 登记记录管理 ====================

async function loadRecords() {
  try {
    console.log('开始加载登记记录...')
    console.log('Supabase URL:', SUPABASE_URL)
    console.log('Supabase Key (前20字符):', SUPABASE_ANON_KEY.substring(0, 20) + '...')
    
    const { data, error } = await supabase
      .from('toll_records')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Supabase查询错误:', error)
      throw error
    }
    
    console.log('成功加载记录数量:', data ? data.length : 0)
    console.log('记录数据:', data)
    
    allRecords = data || []
  } catch (error) {
    console.error('加载记录失败:', error)
    console.error('错误详情:', JSON.stringify(error, null, 2))
    showAlert(`加载记录失败: ${error.message || '未知错误'}`, 'error')
  }
}

function renderRecords() {
  const container = document.getElementById('records-table-container')
  
  if (allRecords.length === 0) {
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
          <th>通行时间</th>
          <th>登记时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${allRecords.map(record => `
          <tr>
            <td><strong>${record.plate_number || '-'}</strong></td>
            <td>${record.free_reason ? `<span class="badge badge-primary">${record.free_reason}</span>` : '-'}</td>
            <td>${record.vehicle_type || '-'}</td>
            <td>${record.toll_collector || '-'}</td>
            <td>${record.monitor || '-'}</td>
            <td>${formatDateTime(record.entry_time)}</td>
            <td>${formatDateTime(record.created_at)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="viewRecord('${record.id}')">查看</button>
                <button class="btn btn-sm btn-danger" onclick="deleteRecord('${record.id}')">删除</button>
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
  
  if (!keyword) {
    renderRecords()
    return
  }
  
  const filtered = allRecords.filter(record => 
    (record.plate_number && record.plate_number.toLowerCase().includes(keyword)) ||
    (record.free_reason && record.free_reason.toLowerCase().includes(keyword)) ||
    (record.toll_collector && record.toll_collector.toLowerCase().includes(keyword)) ||
    (record.monitor && record.monitor.toLowerCase().includes(keyword))
  )
  
  const temp = allRecords
  allRecords = filtered
  renderRecords()
  allRecords = temp
}

async function deleteRecord(id) {
  if (!confirm('确定要删除这条记录吗？')) return
  
  try {
    const { error } = await supabase
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
      <label>通行时间</label>
      <input type="text" value="${formatDateTime(record.entry_time)}" readonly />
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
  `
  
  showModal('查看记录详情', modalBody, null)
}

// ==================== 收费站管理 ====================

async function loadStations() {
  try {
    console.log('开始加载收费站...')
    const { data, error } = await supabase
      .from('toll_stations')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('加载收费站错误:', error)
      throw error
    }
    console.log('成功加载收费站数量:', data ? data.length : 0)
    allStations = data || []
  } catch (error) {
    console.error('加载收费站失败:', error)
    showAlert(`加载收费站失败: ${error.message || '未知错误'}`, 'error')
  }
}

function renderStations() {
  const container = document.getElementById('stations-table-container')
  
  if (allStations.length === 0) {
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
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${allStations.map(station => `
          <tr>
            <td><strong>${station.name}</strong></td>
            <td>${station.code}</td>
            <td>${formatDateTime(station.created_at)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editStation('${station.id}')">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteStation('${station.id}')">删除</button>
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
  const modalBody = `
    <div class="form-group">
      <label>收费站名称 *</label>
      <input type="text" id="station-name" placeholder="请输入收费站名称" />
    </div>
    <div class="form-group">
      <label>收费站编码 *</label>
      <input type="text" id="station-code" placeholder="请输入收费站编码" />
    </div>
  `
  
  showModal('添加收费站', modalBody, addStation)
}

async function addStation() {
  const name = document.getElementById('station-name').value.trim()
  const code = document.getElementById('station-code').value.trim()
  
  if (!name || !code) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await supabase
      .from('toll_stations')
      .insert([{ name, code }])
    
    if (error) throw error
    
    showAlert('添加成功', 'success')
    closeModal()
    await loadStations()
    renderStations()
  } catch (error) {
    console.error('添加失败:', error)
    showAlert('添加失败：' + error.message, 'error')
  }
}

function editStation(id) {
  const station = allStations.find(s => s.id === id)
  if (!station) return
  
  const modalBody = `
    <div class="form-group">
      <label>收费站名称 *</label>
      <input type="text" id="station-name" value="${station.name}" />
    </div>
    <div class="form-group">
      <label>收费站编码 *</label>
      <input type="text" id="station-code" value="${station.code}" />
    </div>
  `
  
  showModal('编辑收费站', modalBody, () => updateStation(id))
}

async function updateStation(id) {
  const name = document.getElementById('station-name').value.trim()
  const code = document.getElementById('station-code').value.trim()
  
  if (!name || !code) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await supabase
      .from('toll_stations')
      .update({ name, code })
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('更新成功', 'success')
    closeModal()
    await loadStations()
    renderStations()
  } catch (error) {
    console.error('更新失败:', error)
    showAlert('更新失败：' + error.message, 'error')
  }
}

async function deleteStation(id) {
  if (!confirm('删除收费站将同时删除其下属的所有班组，确定要删除吗？')) return
  
  try {
    const { error } = await supabase
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
    const { data, error } = await supabase
      .from('toll_groups')
      .select(`
        *,
        toll_stations (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    allGroups = data || []
  } catch (error) {
    console.error('加载班组失败:', error)
  }
}

function renderGroups() {
  const container = document.getElementById('groups-table-container')
  
  if (allGroups.length === 0) {
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
        ${allGroups.map(group => `
          <tr>
            <td><strong>${group.name}</strong></td>
            <td>${group.code}</td>
            <td>${group.toll_stations ? group.toll_stations.name : '-'}</td>
            <td>${formatDateTime(group.created_at)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editGroup('${group.id}')">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteGroup('${group.id}')">删除</button>
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
    const { error } = await supabase
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
    const { error } = await supabase
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
    const { error } = await supabase
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
    const { data, error } = await supabase
      .from('toll_collectors_info')
      .select(`
        *,
        toll_groups (
          id,
          name,
          toll_stations (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    allCollectors = data || []
  } catch (error) {
    console.error('加载收费员失败:', error)
  }
}

function renderCollectors() {
  const container = document.getElementById('collectors-table-container')
  
  if (allCollectors.length === 0) {
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
        ${allCollectors.map(collector => `
          <tr>
            <td><strong>${collector.name}</strong></td>
            <td>${collector.code}</td>
            <td>${collector.toll_groups ? collector.toll_groups.name : '-'}</td>
            <td>${collector.toll_groups && collector.toll_groups.toll_stations ? collector.toll_groups.toll_stations.name : '-'}</td>
            <td>${formatDateTime(collector.created_at)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editCollector('${collector.id}')">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCollector('${collector.id}')">删除</button>
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
  if (allGroups.length === 0) {
    showAlert('请先添加班组', 'error')
    return
  }
  
  const groupOptions = allGroups.map(g => 
    `<option value="${g.id}">${g.name} (${g.toll_stations ? g.toll_stations.name : ''})</option>`
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
      <label>所属班组 *</label>
      <select id="collector-group">
        <option value="">请选择班组</option>
        ${groupOptions}
      </select>
    </div>
  `
  
  showModal('添加收费员', modalBody, addCollector)
}

async function addCollector() {
  const name = document.getElementById('collector-name').value.trim()
  const code = document.getElementById('collector-code').value.trim()
  const groupId = document.getElementById('collector-group').value
  
  if (!name || !code || !groupId) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await supabase
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
  
  const groupOptions = allGroups.map(g => 
    `<option value="${g.id}" ${g.id === collector.group_id ? 'selected' : ''}>${g.name} (${g.toll_stations ? g.toll_stations.name : ''})</option>`
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
    const { error } = await supabase
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
    const { error } = await supabase
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
    const { data, error } = await supabase
      .from('monitors_info')
      .select(`
        *,
        toll_stations (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    allMonitors = data || []
  } catch (error) {
    console.error('加载监控员失败:', error)
  }
}

function renderMonitors() {
  const container = document.getElementById('monitors-table-container')
  
  if (allMonitors.length === 0) {
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
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${allMonitors.map(monitor => `
          <tr>
            <td><strong>${monitor.name}</strong></td>
            <td>${monitor.code}</td>
            <td>${monitor.toll_stations ? monitor.toll_stations.name : '-'}</td>
            <td>${formatDateTime(monitor.created_at)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editMonitor('${monitor.id}')">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteMonitor('${monitor.id}')">删除</button>
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
      <select id="monitor-station">
        <option value="">请选择收费站</option>
        ${stationOptions}
      </select>
    </div>
  `
  
  showModal('添加监控员', modalBody, addMonitor)
}

async function addMonitor() {
  const name = document.getElementById('monitor-name').value.trim()
  const code = document.getElementById('monitor-code').value.trim()
  const stationId = document.getElementById('monitor-station').value
  
  if (!name || !code || !stationId) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await supabase
      .from('monitors_info')
      .insert([{ name, code, station_id: stationId }])
    
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
      <select id="monitor-station">
        ${stationOptions}
      </select>
    </div>
  `
  
  showModal('编辑监控员', modalBody, () => updateMonitor(id))
}

async function updateMonitor(id) {
  const name = document.getElementById('monitor-name').value.trim()
  const code = document.getElementById('monitor-code').value.trim()
  const stationId = document.getElementById('monitor-station').value
  
  if (!name || !code || !stationId) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { error } = await supabase
      .from('monitors_info')
      .update({ name, code, station_id: stationId })
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
    const { error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
  if (allRecords.length === 0) {
    showAlert('暂无数据可导出', 'error')
    return
  }
  
  const data = allRecords.map(record => ({
    '车牌号': record.plate_number || '',
    '免费原因': record.free_reason || '',
    '车型': record.vehicle_type || '',
    '轴数': record.axle_count || '',
    '吨位': record.tonnage || '',
    '入口信息': record.entry_info || '',
    '通行时间': formatDateTime(record.entry_time),
    '收费员': record.toll_collector || '',
    '监控员': record.monitor || '',
    '金额': record.amount || 0,
    '登记时间': formatDateTime(record.created_at)
  }))
  
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '登记记录')
  
  const filename = `免费车登记记录_${formatDate(new Date())}.xlsx`
  XLSX.writeFile(wb, filename)
  
  showAlert('导出成功', 'success')
}

function exportToPDF() {
  if (allRecords.length === 0) {
    showAlert('暂无数据可导出', 'error')
    return
  }
  
  const { jsPDF } = window.jspdf
  const doc = new jsPDF()
  
  // 添加中文字体支持（需要额外配置）
  doc.setFont('helvetica')
  doc.setFontSize(16)
  doc.text('Free Vehicle Registration Records', 14, 15)
  
  const tableData = allRecords.map(record => [
    record.plate_number || '',
    record.free_reason || '',
    record.vehicle_type || '',
    record.toll_collector || '',
    record.monitor || '',
    formatDateTime(record.entry_time),
    formatDateTime(record.created_at)
  ])
  
  doc.autoTable({
    head: [['Plate', 'Reason', 'Type', 'Collector', 'Monitor', 'Entry Time', 'Created']],
    body: tableData,
    startY: 25,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [102, 126, 234] }
  })
  
  const filename = `免费车登记记录_${formatDate(new Date())}.pdf`
  doc.save(filename)
  
  showAlert('导出成功', 'success')
}

// ==================== 工具函数 ====================

function showModal(title, body, onSubmit) {
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-body').innerHTML = body
  document.getElementById('modal').classList.add('active')
  
  const submitBtn = document.getElementById('modal-submit')
  submitBtn.onclick = onSubmit
  submitBtn.style.display = onSubmit ? 'block' : 'none'
}

function closeModal() {
  document.getElementById('modal').classList.remove('active')
}

function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div')
  alertDiv.className = `alert alert-${type}`
  alertDiv.textContent = message
  
  document.querySelector('.content').insertBefore(alertDiv, document.querySelector('.content').firstChild)
  
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
