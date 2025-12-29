// ==================== 收费站管理 ====================

async function loadStations() {
  try {
    let query = window.supabase
      .from('toll_stations')
      .select('*, companies(name)')
      .order('created_at', { ascending: false })
    
    if (currentUser) {
      if (currentUser.role === 'company_admin') {
        query = query.eq('company_id', currentUser.company_id)
      } else if (currentUser.role === 'station_admin') {
        query = query.eq('id', currentUser.station_id)
      }
    }
    
    const { data: stationsData, error: stationsError } = await query
    
    if (stationsError) {
      console.error('加载收费站错误:', stationsError)
      throw stationsError
    }
    
    allStations = stationsData.map(station => {
      const companyName = station.companies ? station.companies.name : '无';
      return {
        ...station,
        company_name: companyName,
        companies: undefined
      }
    });
    
  } catch (error) {
    console.error('加载收费站失败:', error)
    try {
      let query = window.supabase
        .from('toll_stations')
        .select('*')
        .order('created_at', { ascending: false })
      
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
        company_name: '无',
        companies: undefined
      }))
    } catch (fallbackError) {
      console.error('降级加载也失败:', fallbackError)
      allStations = []
      showAlert('加载收费站失败，请检查数据库连接', 'error')
    }
  }
}

function renderStations() {
  const companyFilter = document.getElementById('station-company-filter');
  
  let filteredStations = allStations;
  
  if (companyFilter && companyFilter.value) {
    const selectedCompanyId = companyFilter.value;
    filteredStations = filteredStations.filter(station => 
      station.company_id === selectedCompanyId
    );
  }

  const columns = [
    { 
      key: 'name', 
      label: '收费站名称',
      formatter: (value) => `<strong>${value}</strong>`
    },
    { key: 'code', label: '收费站编码' },
    { key: 'company_name', label: '所属分公司' },
    { 
      key: 'created_at', 
      label: '创建时间',
      formatter: (value) => formatDateTime(value)
    }
  ];

  const actions = [];
  if (currentUser?.role === 'super_admin' || currentUser?.role === 'company_admin') {
    actions.push(
      { label: '编辑', onClick: 'editStation', class: 'btn btn-primary btn-sm' },
      { label: '删除', onClick: 'deleteStation', class: 'btn btn-danger btn-sm' }
    );
  }

  renderCommonTable('stations-table-container', filteredStations, columns, actions, '暂无收费站');
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
  
  const companyId = selectedValue === '' ? null : selectedValue
  
  if (!name || !code) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
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
  
  const selectedValue = companySelect.value
  const companyId = selectedValue === '' ? null : selectedValue
  
  if (!name || !code) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  try {
    const { data: updateData, error: updateError } = await window.supabase
      .from('toll_stations')
      .update({
        name: name,
        code: code,
        company_id: companyId
      })
      .eq('id', id)
      .select('*')
    
    if (updateError) {
      console.error('更新失败:', updateError)
      showAlert(`更新失败：${updateError.message}`, 'error')
      return
    }
    
    if (!updateData || updateData.length === 0) {
      console.error('更新后未返回数据')
      showAlert('更新失败：未返回数据', 'error')
      return
    }
    
    await loadCompanies()
    await loadStations()
    
    showAlert('更新成功', 'success')
    closeModal()
    renderStations()
    initFilters()
  } catch (error) {
    console.error('异常错误:', error)
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
