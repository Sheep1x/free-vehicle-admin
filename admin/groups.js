
// ==================== 班组管理 ====================

async function loadGroups() {
  const selectFields = `
    *,
    toll_stations (
      id,
      name
    )
  `;
  
  // 检查 loadCommonData 函数是否存在
  if (typeof loadCommonData === 'function') {
    await loadCommonData('toll_groups', selectFields, 'group', currentUser, allStations, allGroups, allGroups);
  } else {
    console.error('loadCommonData 函数未定义，无法加载班组数据');
    // 尝试直接从数据库加载数据
    try {
      const { data, error } = await window.supabase
        .from('toll_groups')
        .select(selectFields)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('直接加载班组数据失败:', error);
      } else {
        allGroups = data || [];
        console.log('直接加载班组数据成功，共', allGroups.length, '条记录');
      }
    } catch (error) {
      console.error('直接加载班组数据异常:', error);
    }
  }
}

function renderGroups() {
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

  // 定义表格列
  const columns = [
    { 
      key: 'name', 
      label: '班组名称',
      formatter: (value) => `<strong>${value}</strong>`
    },
    { key: 'code', label: '班组编码' },
    { 
      key: 'toll_stations.name', 
      label: '所属收费站',
      formatter: (value, item) => item.toll_stations?.name || '-'
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
      { label: '编辑', onClick: 'editGroup', class: 'btn btn-primary btn-sm' },
      { label: '删除', onClick: 'deleteGroup', class: 'btn btn-danger btn-sm' }
    );
  }

  // 使用通用表格渲染函数
  renderCommonTable('groups-table-container', filteredGroups, columns, actions, '暂无班组');
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

function updateGroupStationOptions() {
  updateStationOptions('group-company-filter', 'group-station-filter', allStations);
}

function initGroupsFilters() {
    const groupCompanyFilter = document.getElementById('group-company-filter');
    const stationFilter = document.getElementById('group-station-filter');

    if (groupCompanyFilter) {
        groupCompanyFilter.addEventListener('change', () => {
            updateGroupStationOptions();
            renderGroups();
        });
    }

    if (stationFilter) {
        stationFilter.addEventListener('change', renderGroups);
    }
    
    // 初始化收费站下拉框选项
    updateGroupStationOptions();
}

// 添加监控员管理页面的initMonitorsFilters函数
// 确保在admin.js调用时不会出错
if (typeof initMonitorsFilters === 'undefined') {
    function initMonitorsFilters() {
        console.warn('initMonitorsFilters function is already defined in monitors.js');
    }
}
