
// ==================== 用户管理 ====================

// 加载用户数据
async function loadUsers() {
  try {
    console.log('开始加载用户数据...')
    const { data, error } = await window.supabase
      .from('admin_users')
      .select('*, companies(name), toll_stations(name)')
      .order('created_at', { ascending: false })
    
    console.log('加载用户数据结果:', { data, error })
    
    if (error) {
      console.error('加载用户错误:', error)
      // 如果是表不存在的错误，显示创建表的提示
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('表不存在')) {
        showAlert('用户表不存在，请联系系统管理员创建相关表结构', 'error')
      } else {
        showAlert(`加载用户失败: ${error.message || '未知错误'}`, 'error')
      }
      return
    }
    
    allUsers = data || []
    console.log('成功加载用户数量:', allUsers.length)
    
    // 如果没有用户，创建初始用户
    if (allUsers.length === 0) {
      await initAdminUsers()
    }
  } catch (error) {
    console.error('加载用户失败:', error)
    showAlert(`加载用户失败: ${error.message || '未知错误'}`, 'error')
  }
}

// 初始化管理员用户
async function initAdminUsers() {
  try {
    console.log('开始初始化管理员用户...')
    
    // 检查是否已有用户
    const { data: users, error: usersError } = await window.supabase
      .from('admin_users')
      .select('*')
    
    console.log('检查现有用户结果:', { users, usersError })
    
    if (!usersError && (!users || users.length === 0)) {
      console.log('系统中暂无用户，请联系系统管理员创建初始管理员账户')
      showAlert('系统中暂无用户，请联系系统管理员创建初始管理员账户', 'warning')
      return
    }
  } catch (error) {
    console.error('初始化用户失败:', error)
    showAlert(`初始化用户失败: ${error.message || '未知错误'}，请联系系统管理员`, 'error')
  }
}

// 渲染用户列表
function renderUsers() {
  const container = document.getElementById('users-table-container')
  
  console.log('=== 开始渲染用户列表 ===')
  console.log('当前用户:', currentUser)
  console.log('所有用户:', allUsers)
  
  // 根据当前用户角色过滤用户列表
  let filteredUsers = allUsers;
  
  // 角色权限级别: super_admin > company_admin > station_admin
  const roleHierarchy = {
    'super_admin': 3,
    'company_admin': 2,
    'station_admin': 1
  };
  
  // 确保currentUser不为null
  if (!currentUser) {
    console.error('renderUsers: currentUser is null');
    return;
  }
  
  // 当前用户的权限级别
  const currentUserLevel = roleHierarchy[currentUser.role] || 0;
  
  console.log('当前用户角色:', currentUser.role, '权限级别:', currentUserLevel)
  
  // 过滤规则: 根据角色和所属公司过滤用户
  filteredUsers = allUsers.filter(user => {
    const userLevel = roleHierarchy[user.role] || 0;
    console.log('检查用户:', user.username, '角色:', user.role, '权限级别:', userLevel)
    
    // 只有超级管理员能看到所有用户
    if (currentUser.role === 'super_admin') {
      console.log('超级管理员可以看到所有用户，允许显示:', user.username)
      return true;
    }
    // 分公司管理员可以看到自己分公司下的所有用户
    else if (currentUser.role === 'company_admin') {
      const isSameCompany = user.company_id === currentUser.company_id;
      const canSee = isSameCompany;
      console.log('分公司管理员检查:', user.username, '同一分公司:', isSameCompany, '可以看到:', canSee)
      return canSee;
    }
    // 收费站管理员看不到任何其他用户
    else {
      console.log('收费站管理员看不到任何用户，允许显示:', false)
      return false;
    }
  });
  
  console.log('过滤后的用户列表:', filteredUsers)
  console.log('=== 渲染用户列表结束 ===')
  
  if (filteredUsers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无用户</p>
      </div>
    `
    return
  }
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>用户名</th>
          <th>角色</th>
          <th>所属分公司</th>
          <th>所属收费站</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filteredUsers.map(user => `
          <tr>
            <td><strong>${user.username}</strong></td>
            <td>${getRoleName(user.role)}</td>
            <td>${user.companies ? user.companies.name : '无'}</td>
            <td>${user.toll_stations ? user.toll_stations.name : '无'}</td>
            <td>${formatDateTime(user.created_at)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">删除</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  
  container.innerHTML = tableHTML
}

// 显示添加用户模态框
function showAddUserModal() {
  // 确保currentUser不为null
  if (!currentUser) {
    console.error('showAddUserModal: currentUser is null');
    return;
  }
  
  // 生成分公司选项
  let companyOptions = '';
  
  // 生成收费站选项
  let stationOptions = '';
  
  // 根据当前用户角色过滤选项
  if (currentUser.role === 'super_admin') {
    // 超级管理员可以看到所有分公司和收费站
    companyOptions = allCompanies.map(c => 
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
    
    stationOptions = allStations.map(s => 
      `<option value="${s.id}">${s.name}</option>`
    ).join('');
  } else if (currentUser.role === 'company_admin') {
    // 分公司管理员只能看到自己的分公司和自己分公司下的收费站
    companyOptions = `<option value="${currentUser.company_id}" selected>${allCompanies.find(c => c.id === currentUser.company_id)?.name || ''}</option>`;
    
    const companyStations = allStations.filter(s => s.company_id === currentUser.company_id);
    stationOptions = companyStations.map(s => 
      `<option value="${s.id}">${s.name}</option>`
    ).join('');
  }
  
  // 根据当前用户角色生成可用的角色选项
  let roleOptions = '';
  let canAddUsers = false;
  
  // 角色权限级别: super_admin > company_admin > station_admin
  // 超级严格限制：低级用户完全看不到高级角色选项
  switch(currentUser.role) {
    case 'super_admin':
      // 超级管理员可以添加所有角色
      roleOptions = `
        <option value="super_admin">超级管理员</option>
        <option value="company_admin">分公司管理员</option>
        <option value="station_admin">收费站管理员</option>
      `;
      canAddUsers = true;
      break;
    case 'company_admin':
      // 分公司管理员只能添加更低级别的角色（收费站管理员），完全看不到高级角色选项
      roleOptions = `
        <option value="station_admin">收费站管理员</option>
      `;
      canAddUsers = true;
      break;
    case 'station_admin':
      // 收费站管理员是最低级别，不能添加任何角色
      roleOptions = '';
      canAddUsers = false;
      break;
    default:
      roleOptions = '';
      canAddUsers = false;
      break;
  }
  
  // 如果不能添加用户，显示提示
  if (!canAddUsers) {
    showAlert('您没有权限添加用户', 'error');
    return;
  }
  
  const modalBody = `
    <div class="form-group">
      <label>用户名 *</label>
      <input type="text" id="user-username" placeholder="请输入用户名" />
    </div>
    <div class="form-group">
      <label>密码 *</label>
      <input type="password" id="user-password" placeholder="请输入密码" />
    </div>
    <div class="form-group">
      <label>角色 *</label>
      <select id="user-role">
        ${roleOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属分公司</label>
      <select id="user-company">
        <option value="">无</option>
        ${companyOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属收费站</label>
      <select id="user-station">
        <option value="">无</option>
        ${stationOptions}
      </select>
    </div>
  `
  
  showModal('添加用户', modalBody, addUser)
}

// 添加用户
async function addUser() {
  const username = document.getElementById('user-username').value.trim()
  const password = document.getElementById('user-password').value.trim()
  const role = document.getElementById('user-role').value
  const companyId = document.getElementById('user-company').value || null
  const stationId = document.getElementById('user-station').value || null
  
  if (!username || !password || !role) {
    showAlert('请填写所有必填项', 'error')
    return
  }
  
  // 严格的角色权限检查
  const roleHierarchy = {
    'super_admin': 3,
    'company_admin': 2,
    'station_admin': 1
  };
  
  // 确保currentUser不为null
  if (!currentUser) {
    console.error('addUser: currentUser is null');
    return;
  }
  
  const currentUserLevel = roleHierarchy[currentUser.role] || 0;
  const newUserLevel = roleHierarchy[role] || 0;
  
  // 检查是否有权限添加该角色
  switch(currentUser.role) {
    case 'super_admin':
      // 超级管理员可以添加所有角色
      break;
    case 'company_admin':
      // 分公司管理员只能添加更低级别的角色（收费站管理员）
      if (newUserLevel !== 1) {
        showAlert('您只能添加收费站管理员角色', 'error');
        return;
      }
      break;
    case 'station_admin':
      // 收费站管理员不能添加任何角色
      showAlert('您没有权限添加用户', 'error');
      return;
    default:
      showAlert('您没有权限添加用户', 'error');
      return;
  }
  
  try {
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    const { error } = await window.supabase
      .from('admin_users')
      .insert([{
        username,
        password: hashedPassword,
        role,
        company_id: companyId,
        station_id: stationId
      }])
    
    if (error) throw error
    
    showAlert('添加成功', 'success')
    closeModal()
    await loadUsers()
    renderUsers()
  } catch (error) {
    console.error('添加用户失败:', error)
    showAlert('添加失败：' + error.message, 'error')
  }
}

// 编辑用户
function editUser(id) {
  const user = allUsers.find(u => u.id === id)
  if (!user) return
  
  // 角色权限级别: super_admin > company_admin > station_admin
  const roleHierarchy = {
    'super_admin': 3,
    'company_admin': 2,
    'station_admin': 1
  };
  
  // 当前用户的权限级别
  const currentUserLevel = roleHierarchy[currentUser.role] || 0;
  // 被编辑用户的权限级别
  const targetUserLevel = roleHierarchy[user.role] || 0;
  
  // 检查权限：只能编辑权限级别低于或等于自己的用户
  if (targetUserLevel > currentUserLevel) {
    showAlert('您没有权限编辑该用户', 'error');
    return;
  }
  
  // 生成分公司选项
  const companyOptions = allCompanies.map(c => 
    `<option value="${c.id}" ${user.company_id === c.id ? 'selected' : ''}>${c.name}</option>`
  ).join('')
  
  // 生成收费站选项
  const stationOptions = allStations.map(s => 
    `<option value="${s.id}" ${user.station_id === s.id ? 'selected' : ''}>${s.name}</option>`
  ).join('')
  
  // 根据当前用户角色生成可用的角色选项
  let roleOptions = '';
  
  // 超级严格限制：只能编辑为更低或相同级别的角色，不能升级角色，且完全看不到高级角色选项
  switch(currentUser.role) {
    case 'super_admin':
      // 超级管理员可以编辑所有角色，但不能将低级角色升级为高级角色
      if (user.role === 'super_admin') {
        roleOptions = `
          <option value="super_admin" selected>超级管理员</option>
        `;
      } else if (user.role === 'company_admin') {
        roleOptions = `
          <option value="company_admin" selected>分公司管理员</option>
          <option value="station_admin">收费站管理员</option>
        `;
      } else {
        roleOptions = `
          <option value="station_admin" selected>收费站管理员</option>
        `;
      }
      break;
    case 'company_admin':
      // 分公司管理员只能编辑更低或相同级别的角色，完全看不到高级角色选项
      if (user.role === 'company_admin') {
        // 分公司管理员可以将自己降级为收费站管理员，但不能升级
        roleOptions = `
          <option value="company_admin" selected>分公司管理员</option>
          <option value="station_admin">收费站管理员</option>
        `;
      } else if (user.role === 'station_admin') {
        // 只能编辑收费站管理员，不能升级
        roleOptions = `
          <option value="station_admin" selected>收费站管理员</option>
        `;
      }
      break;
    case 'station_admin':
      // 收费站管理员只能编辑相同级别的角色，完全看不到高级角色选项
      roleOptions = `
        <option value="station_admin" selected>收费站管理员</option>
      `;
      break;
  }
  
  const modalBody = `
    <div class="form-group">
      <label>用户名</label>
      <input type="text" id="user-username" value="${user.username}" readonly />
    </div>
    <div class="form-group">
      <label>密码（留空则不修改）</label>
      <input type="password" id="user-password" placeholder="请输入密码" />
    </div>
    <div class="form-group">
      <label>角色 *</label>
      <select id="user-role">
        ${roleOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属分公司</label>
      <select id="user-company">
        <option value="" ${!user.company_id ? 'selected' : ''}>无</option>
        ${companyOptions}
      </select>
    </div>
    <div class="form-group">
      <label>所属收费站</label>
      <select id="user-station">
        <option value="" ${!user.station_id ? 'selected' : ''}>无</option>
        ${stationOptions}
      </select>
    </div>
  `
  
  showModal('编辑用户', modalBody, () => updateUser(id))
}

// 更新用户
async function updateUser(id) {
  const username = document.getElementById('user-username').value.trim()
  const password = document.getElementById('user-password').value.trim()
  const role = document.getElementById('user-role').value
  const companyId = document.getElementById('user-company').value || null
  const stationId = document.getElementById('user-station').value || null
  
  // 构建更新对象
  const updateData = {
    role,
    company_id: companyId,
    station_id: stationId
  }
  
  // 如果密码不为空，则更新密码
  if (password) {
    updateData.password = bcrypt.hashSync(password, 10)
  }
  
  try {
    const { error } = await window.supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('更新成功', 'success')
    closeModal()
    await loadUsers()
    renderUsers()
  } catch (error) {
    console.error('更新用户失败:', error)
    showAlert('更新失败：' + error.message, 'error')
  }
}

// 删除用户
async function deleteUser(id) {
  const user = allUsers.find(u => u.id === id)
  if (!user) return
  
  // 角色权限级别: super_admin > company_admin > station_admin
  const roleHierarchy = {
    'super_admin': 3,
    'company_admin': 2,
    'station_admin': 1
  };
  
  // 当前用户的权限级别
  const currentUserLevel = roleHierarchy[currentUser.role] || 0;
  // 被删除用户的权限级别
  const targetUserLevel = roleHierarchy[user.role] || 0;
  
  // 检查权限：只能删除权限级别低于或等于自己的用户
  if (targetUserLevel > currentUserLevel) {
    showAlert('您没有权限删除该用户', 'error');
    return;
  }
  
  // 不能删除自己
  if (user.id === currentUser.id) {
    showAlert('不能删除自己', 'error');
    return;
  }
  
  if (!confirm('确定要删除这个用户吗？')) return
  
  try {
    const { error } = await window.supabase
      .from('admin_users')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    showAlert('删除成功', 'success')
    await loadUsers()
    renderUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    showAlert('删除失败：' + error.message, 'error')
  }
}
