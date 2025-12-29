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