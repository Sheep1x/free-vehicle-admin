// ==================== 班次设置 ====================

async function loadShifts() {
  try {
    const { data, error } = await window.supabase
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
    const { error } = await window.supabase
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
