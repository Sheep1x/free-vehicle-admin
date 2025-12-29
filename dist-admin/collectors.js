// ==================== 收费员管理 ====================

async function loadCollectors() {
  const selectFields = `
    *,
    toll_groups (
      id,
      name,
      station_id,
      toll_stations (
        name
      )
    )
  `;
  
  await loadCommonData('toll_collectors_info', selectFields, 'collector', currentUser, allStations, allGroups, allCollectors);
}

function renderCollectors() {
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

  // 定义表格列
  const columns = [
    { 
      key: 'name', 
      label: '姓名',
      formatter: (value) => `<strong>${value}</strong>`
    },
    { key: 'code', label: '工号' },
    { 
      key: 'toll_groups.name', 
      label: '所属班组',
      formatter: (value, item) => item.toll_groups?.name || '-'
    },
    { 
      key: 'toll_groups.toll_stations.name', 
      label: '所属收费站',
      formatter: (value, item) => item.toll_groups?.toll_stations?.name || '-'
    },
    { 
      key: 'created_at', 
      label: '创建时间',
      formatter: (value) => formatDateTime(value)
    }
  ];

  // 定义操作按钮
  const actions = [];
  if (currentUser?.role === 'super_admin' || currentUser?.role === 'company_admin' || currentUser?.role === 'station_admin') {
    actions.push(
      { label: '编辑', onClick: 'editCollector', class: 'btn btn-primary btn-sm' },
      { label: '删除', onClick: 'deleteCollector', class: 'btn btn-danger btn-sm' }
    );
  }

  // 使用通用表格渲染函数
  renderCommonTable('collectors-table-container', filteredCollectors, columns, actions, '暂无收费员');
}

function showAddCollectorModal() {
  if (allStations.length === 0) {
    showAlert('请先添加收费站', 'error')
    return
  }
  
  let stationOptions = ''
  let selectedStationId = ''
  let stationDisabled = false
  
  if (currentUser.role === 'station_admin') {
    // 收费站管理员只能添加自己收费站的收费员
    const currentStation = allStations.find(s => s.id === currentUser.station_id)
    if (currentStation) {
      stationOptions = `<option value="${currentStation.id}" selected>${currentStation.name}</option>`
      selectedStationId = currentStation.id
      stationDisabled = true
    }
  } else {
    // 其他角色可以选择所有收费站
    stationOptions = allStations.map(s => 
      `<option value="${s.id}">${s.name}</option>`
    ).join('')
  }
  
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
      <select id="collector-station" onchange="updateCollectorGroupOptions()" ${stationDisabled ? 'disabled' : ''}>
        ${stationDisabled ? '' : '<option value="">请选择收费站</option>'}
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
  
  // 如果是收费站管理员，自动更新班组选项
  if (stationDisabled && selectedStationId) {
    updateCollectorGroupOptions()
  }
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
  let currentStationId = currentGroup ? currentGroup.station_id : null;
  
  // 检查当前用户是否有权限编辑该收费员
  if (currentUser.role === 'station_admin') {
    // 收费站管理员只能编辑自己收费站的收费员
    if (currentStationId !== currentUser.station_id) {
      showAlert('您没有权限编辑该收费员', 'error')
      return
    }
  }
  
  let stationOptions = ''
  let stationDisabled = false
  
  if (currentUser.role === 'station_admin') {
    // 收费站管理员只能编辑自己收费站的收费员，收费站字段禁用
    const currentStation = allStations.find(s => s.id === currentUser.station_id)
    if (currentStation) {
      stationOptions = `<option value="${currentStation.id}" selected>${currentStation.name}</option>`
      currentStationId = currentStation.id
      stationDisabled = true
    }
  } else {
    // 其他角色可以选择所有收费站
    stationOptions = allStations.map(s => 
      `<option value="${s.id}" ${s.id === currentStationId ? 'selected' : ''}>${s.name}</option>`
    ).join('')
  }
  
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
      <select id="collector-station" onchange="updateCollectorGroupOptions()" ${stationDisabled ? 'disabled' : ''}>
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

function updateCollectorStationOptions() {
  updateStationOptions('collector-company-filter', 'collector-station-filter', allStations, updateCollectorGroupFilter);
}

function updateCollectorGroupFilter() {
  const stationFilter = document.getElementById('collector-station-filter');
  const groupFilter = document.getElementById('collector-group-filter');
  
  if (stationFilter && groupFilter) {
    const selectedStationId = stationFilter.value;
    
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
  }
}

function updateCollectorGroupOptions() {
  const stationSelect = document.getElementById('collector-station');
  const groupSelect = document.getElementById('collector-group');
  
  if (stationSelect && groupSelect) {
    const selectedStationId = stationSelect.value;
    
    groupSelect.innerHTML = '<option value="">请选择班组</option>';
    
    let filteredGroups = allGroups;
    if (selectedStationId) {
      filteredGroups = allGroups.filter(group => group.station_id === selectedStationId);
    }
    
    filteredGroups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      groupSelect.appendChild(option);
    });
  }
}

function initCollectorsFilters() {
    const collectorCompanyFilter = document.getElementById('collector-company-filter');
    const collectorStationFilter = document.getElementById('collector-station-filter');
    const collectorGroupFilter = document.getElementById('collector-group-filter');

    if (collectorCompanyFilter) {
        collectorCompanyFilter.addEventListener('change', () => {
            updateCollectorStationOptions();
            renderCollectors();
        });
    }
    if (collectorStationFilter) {
        collectorStationFilter.addEventListener('change', () => {
            updateCollectorGroupFilter();
            renderCollectors();
        });
    }
    if (collectorGroupFilter) {
        collectorGroupFilter.addEventListener('change', renderCollectors);
    }
    
    // 初始化收费站下拉框选项
    updateCollectorStationOptions();
    
    // 初始化班组下拉框选项
    updateCollectorGroupFilter();
}

// 确保records.js中的initRecordsFilters函数存在
if (typeof initRecordsFilters === 'undefined') {
    function initRecordsFilters() {
        console.warn('initRecordsFilters function is missing');
    }
}
