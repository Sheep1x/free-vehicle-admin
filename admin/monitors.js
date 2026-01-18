// ==================== 监控员管理 ====================

async function loadMonitors() {
  const selectFields = `
    *,
    toll_stations (
      id,
      name
    ),
    toll_groups (
      id,
      name
    )
  `;
  
  // 检查 loadCommonData 函数是否存在
  if (typeof loadCommonData === 'function') {
    await loadCommonData('monitors_info', selectFields, 'monitor', currentUser, allStations, allGroups, allMonitors);
  } else {
    console.error('loadCommonData 函数未定义，无法加载监控员数据');
    // 尝试直接从数据库加载数据
    try {
      const { data, error } = await window.supabase
        .from('monitors_info')
        .select(selectFields)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('直接加载监控员数据失败:', error);
      } else {
        allMonitors = data || [];
        console.log('直接加载监控员数据成功，共', allMonitors.length, '条记录');
      }
    } catch (error) {
      console.error('直接加载监控员数据异常:', error);
    }
  }
}

function renderMonitors() {
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

  // 定义表格列
  const columns = [
    { 
      key: 'name', 
      label: '姓名',
      formatter: (value) => `<strong>${value}</strong>`
    },
    { key: 'code', label: '工号' },
    { 
      key: 'toll_stations.name', 
      label: '所属收费站',
      formatter: (value, item) => item.toll_stations?.name || '-'
    },
    { 
      key: 'toll_groups.name', 
      label: '所属班组',
      formatter: (value, item) => item.toll_groups?.name || '-'
    },
    { 
      key: 'created_at', 
      label: '创建时间',
      formatter: (value) => formatDateTime(value)
    }
  ];

  // 定义操作按钮
  const actions = [];
  if (currentUser?.role === 'super_admin' || currentUser?.role === 'company_admin' || currentUser?.role === 'station_admin' || currentUser?.role === 'centers_admin') {
    actions.push(
      { label: '编辑', onClick: 'editMonitor', class: 'btn btn-primary btn-sm' },
      { label: '删除', onClick: 'deleteMonitor', class: 'btn btn-danger btn-sm' }
    );
  }

  // 使用通用表格渲染函数
  renderCommonTable('monitors-table-container', filteredMonitors, columns, actions, '暂无监控员');
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

// ==================== Filter Functions ====================

// This function was originally in admin.js
function updateMonitorStationOptions() {
  updateStationOptions('monitor-company-filter', 'monitor-station-filter', allStations, updateMonitorGroupFilter);
}

// This function was originally in admin.js
function updateMonitorGroupFilter() {
  const stationFilter = document.getElementById('monitor-station-filter');
  const groupFilter = document.getElementById('monitor-group-filter');

  if (stationFilter && groupFilter) {
    const selectedStationId = stationFilter.value;
    const originalGroupValue = groupFilter.value; // Preserve selection

    groupFilter.innerHTML = '<option value="">所有班组</option>';

    let filteredGroups = allGroups;
    if (selectedStationId) {
      filteredGroups = allGroups.filter(group => group.station_id === selectedStationId);
    }

    filteredGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      groupFilter.appendChild(option);
    });
    groupFilter.value = originalGroupValue;
  }
}

// This function was originally in admin.js and is used by the add/edit modal
function updateMonitorGroupOptions() {
  const stationSelect = document.getElementById('monitor-station');
  const groupSelect = document.getElementById('monitor-group');

  if (stationSelect && groupSelect) {
    const selectedStationId = stationSelect.value;
    groupSelect.innerHTML = '<option value="">请选择班组</option>';

    let filteredGroups = allGroups;
    if (selectedStationId) {
      filteredGroups = allGroups.filter(g => g.station_id === selectedStationId);
    }
    
    filteredGroups.forEach(g => {
      const option = document.createElement('option');
      option.value = g.id;
      option.textContent = g.name;
      groupSelect.appendChild(option);
    });
  }
}

function initMonitorsFilters() {
    const companyFilter = document.getElementById('monitor-company-filter');
    const stationFilter = document.getElementById('monitor-station-filter');
    const groupFilter = document.getElementById('monitor-group-filter');

    if(companyFilter) {
        companyFilter.addEventListener('change', () => {
            updateMonitorStationOptions();
            renderMonitors();
        });
    }

    if(stationFilter) {
        stationFilter.addEventListener('change', () => {
            updateMonitorGroupFilter();
            renderMonitors();
        });
    }

    if(groupFilter) {
        groupFilter.addEventListener('change', renderMonitors);
    }
    
    // 初始化收费站下拉框选项
    updateMonitorStationOptions();
    
    // 初始化班组下拉框选项
    updateMonitorGroupFilter();
}
