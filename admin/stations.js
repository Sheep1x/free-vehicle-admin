
// ==================== 收费站管理 ====================

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
      // 动态判断权限：
      // - 分公司管理员可以看到自己分公司下的所有收费站
      // - 收费站管理员如果关联了分公司，可以看到该分公司的所有收费站
      // - 普通收费站管理员只能看到自己管理的收费站
      const canSeeAllCompanyStations = currentUser.role === 'company_admin' || 
                                      (currentUser.role === 'station_admin' && currentUser.company_id);
      
      if (canSeeAllCompanyStations) {
        // 分公司管理员或关联了分公司的收费站管理员可以看到自己分公司下的所有收费站
        query = query.eq('company_id', currentUser.company_id)
      } else if (currentUser.role === 'station_admin') {
        // 普通收费站管理员只能看到自己管理的收费站
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
        // 动态判断权限：
        // - 分公司管理员可以看到自己分公司下的所有收费站
        // - 收费站管理员如果关联了分公司，可以看到该分公司的所有收费站
        // - 普通收费站管理员只能看到自己管理的收费站
        const canSeeAllCompanyStations = currentUser.role === 'company_admin' || 
                                        (currentUser.role === 'station_admin' && currentUser.company_id);
        
        if (canSeeAllCompanyStations) {
          // 分公司管理员或关联了分公司的收费站管理员可以看到自己分公司下的所有收费站
          query = query.eq('company_id', currentUser.company_id)
        } else if (currentUser.role === 'station_admin') {
          // 普通收费站管理员只能看到自己管理的收费站
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
