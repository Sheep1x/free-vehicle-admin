// ==================== 分公司管理 ====================

async function loadCompanies() {
  try {
    let query = window.supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (currentUser) {
      if (currentUser.role === 'company_admin') {
        query = query.eq('id', currentUser.company_id)
      } else if (currentUser.role === 'station_admin') {
        allCompanies = []
        return
      }
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('加载分公司错误:', error)
      throw error
    }
    allCompanies = data || []
  } catch (error) {
    console.error('加载分公司失败:', error)
    showAlert(`加载分公司失败: ${error.message || '未知错误'}`, 'error')
  }
}

function renderCompanies() {
  const columns = [
    { 
      key: 'name', 
      label: '分公司名称',
      formatter: (value) => `<strong>${value}</strong>`
    },
    { key: 'code', label: '分公司编码' },
    { 
      key: 'created_at', 
      label: '创建时间',
      formatter: (value) => formatDateTime(value)
    }
  ];

  const actions = [];
  if (currentUser?.role === 'super_admin') {
    actions.push(
      { label: '编辑', onClick: 'editCompany', class: 'btn btn-primary btn-sm' },
      { label: '删除', onClick: 'deleteCompany', class: 'btn btn-danger btn-sm' }
    );
  }

  renderCommonTable('companies-table-container', allCompanies, columns, actions, '暂无分公司');
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
