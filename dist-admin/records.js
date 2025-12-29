// ==================== 登记记录管理 ====================

async function loadRecords() {
  try {
    console.log('开始加载登记记录...');

    let query = window.supabase
      .from('toll_records')
      .select(`
        id,
        plate_number,
        free_reason,
        vehicle_type,
        axle_count,
        tonnage,
        entry_info,
        toll_collector,
        monitor,
        amount,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      const endDateWithTime = new Date(endDate);
      endDateWithTime.setDate(endDateWithTime.getDate() + 1);
      query = query.lt('created_at', endDateWithTime.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase查询错误:', error);
      throw error;
    }

    console.log(`成功加载记录数量: ${data ? data.length : 0}`);

    const recordsWithStation = data.map(record => {
      let stationName = '未知';
      let stationId = '';

      if (allCollectors && allCollectors.length > 0) {
        const parts = record.toll_collector?.split(' ');
        let collector = null;

        if (parts && parts.length >= 2) {
          const employeeId = parts[0];
          collector = allCollectors.find(c => c.code === employeeId);
        }

        if (!collector) {
          const name = record.toll_collector?.split(' ')[1] || record.toll_collector;
          collector = allCollectors.find(c => c.name === name);
        }

        if (collector?.toll_groups) {
          if (collector.toll_groups.toll_stations) {
            stationName = collector.toll_groups.toll_stations.name;
            stationId = collector.toll_groups.station_id;
          } else if (allStations && allStations.length > 0 && collector.toll_groups.station_id) {
            const groupStationId = collector.toll_groups.station_id;
            const station = allStations.find(s => 
              s.id === groupStationId || 
              s.station_id === groupStationId ||
              s.code === groupStationId
            );

            if (station) {
              stationName = station.name;
              stationId = station.id || station.station_id;
            } else {
              stationName = `未知站: ${groupStationId.substring(0, 8)}...`;
              stationId = groupStationId;
            }
          }
        }
      }

      return {
        ...record,
        station_name: stationName,
        station_id: stationId
      };
    });

    let filteredByRole = recordsWithStation;

    if (currentUser) {
      if (currentUser.role === 'company_admin') {
        const companyStationIds = allStations
          .filter(station => station.company_id === currentUser.company_id)
          .map(station => station.id);

        filteredByRole = recordsWithStation.filter(record => {
          return !record.station_id || companyStationIds.includes(record.station_id);
        });
      } else if (currentUser.role === 'station_admin') {
        filteredByRole = recordsWithStation.filter(record => {
          return !record.station_id || record.station_id === currentUser.station_id;
        });
      }
    }

    allRecords = filteredByRole || [];
    filteredRecords = [...allRecords];

    console.log(`记录数据处理完成，共 ${allRecords.length} 条记录`);
  } catch (error) {
    console.error('加载记录失败:', error);
    showAlert(`加载记录失败: ${error.message || '未知错误'}`, 'error');
  }
}

// 应用日期筛选
function applyDateFilter() {
  startDate = document.getElementById('start-date').value
  endDate = document.getElementById('end-date').value
  
  // 彩蛋：结束日期早于开始日期时触发
  if (startDate && endDate && endDate < startDate) {
    // 使用模态框显示彩蛋
    showModal('🎉 恭喜您触发彩蛋！', `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin: 20px 0;">😁</div>
        <h3 style="color: #4f46e5; margin: 20px 0;">获得「没有脑子」称号！</h3>
        <p style="font-size: 18px; color: #64748b; margin: 20px 0;">该称号将为所有用户播报！</p>
        <p style="font-size: 14px; color: #94a3b8; margin-top: 30px;">提示：结束日期不能早于开始日期哦~</p>
      </div>
    `, null, '拾取脑子')
    return
  }
  
  loadAllData() // 重新加载数据，应用筛选条件
}

// 清空日期筛选
function clearDateFilter() {
  document.getElementById('start-date').value = ''
  document.getElementById('end-date').value = ''
  startDate = ''
  endDate = ''
  
  loadAllData() // 重新加载数据，清除筛选条件
}

// 重新加载所有数据（用于筛选条件变化时）
async function loadAllData() {
  // 按顺序重新加载所有相关数据，确保stations先加载完成
  await loadCompanies();
  await loadStations();
  await loadGroups();
  await loadCollectors(); // 确保收费员数据被加载
  await loadRecords(); // 重新加载记录数据，此时stations已加载完成
  
  // 应用筛选条件并渲染记录
  filterAndRenderRecords();
  
  // 更新统计信息
  updateStats();
}

function filterAndRenderRecords() {
  const keyword = document.getElementById('search-records')?.value?.toLowerCase() || '';
  const companyFilter = document.getElementById('record-company-filter');
  const stationFilter = document.getElementById('record-station-filter');

  let tempFilteredRecords = allRecords;

  // 1. Filter by keyword
  if (keyword) {
    tempFilteredRecords = tempFilteredRecords.filter(record => 
      (record.plate_number && record.plate_number.toLowerCase().includes(keyword)) ||
      (record.free_reason && record.free_reason.toLowerCase().includes(keyword)) ||
      (record.toll_collector && record.toll_collector.toLowerCase().includes(keyword)) ||
      (record.monitor && record.monitor.toLowerCase().includes(keyword))
    );
  }

  // 2. Filter by company
  if (companyFilter && companyFilter.value) {
    const selectedCompanyId = companyFilter.value;
    const stationIds = allStations.filter(s => s.company_id === selectedCompanyId).map(s => s.id);
    tempFilteredRecords = tempFilteredRecords.filter(r => stationIds.includes(r.station_id));
  }

  // 3. Filter by station
  if (stationFilter && stationFilter.value) {
    tempFilteredRecords = tempFilteredRecords.filter(record => record.station_id === stationFilter.value);
  }

  filteredRecords = tempFilteredRecords;
  renderRecords();
  updateStats();
}

function renderRecords() {
  const container = document.getElementById('records-table-container')
  
  if (filteredRecords.length === 0) {
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
          <th>收费站</th>
          <th>登记时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${filteredRecords.map(record => `
          <tr>
            <td><strong>${record.plate_number || '-'}</strong></td>
            <td>${record.free_reason ? `<span class="badge badge-primary">${record.free_reason}</span>` : '-'}</td>
            <td>${record.vehicle_type || '-'}</td>
            <td>${record.toll_collector || '-'}</td>
            <td>${record.monitor || '-'}</td>
            <td>${record.station_name || '-'}</td>
            <td>${formatDateTime(record.created_at)}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="viewRecord('${record.id}')">查看</button>
                ${(currentUser.role === 'super_admin' || currentUser.role === 'company_admin') ? `
                  <button class="btn btn-sm btn-danger" onclick="deleteRecord('${record.id}')">删除</button>
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

function updateStats() {
  const total = allRecords.length
  const today = allRecords.filter(r => isToday(r.created_at)).length
  const month = allRecords.filter(r => isThisMonth(r.created_at)).length
  
  document.getElementById('total-records').textContent = total
  document.getElementById('today-records').textContent = today
  document.getElementById('month-records').textContent = month
}

async function deleteRecord(id) {
  if (!confirm('确定要删除这条记录吗？')) return
  
  try {
    const { error } = await window.supabase
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
    <div class="form-group">
      <label>登记时间</label>
      <input type="text" value="${formatDateTime(record.created_at)}" readonly />
    </div>
  `
  
  showModal('查看记录详情', modalBody, null)
}

// ==================== 导出功能 ====================

function exportToExcel() {
  try {
    if (filteredRecords.length === 0) {
      showAlert('暂无数据可导出', 'error')
      return
    }
    
    // 处理入口信息，移除()及其中内容
    const processEntryInfo = (entryInfo) => {
      if (!entryInfo) return '';
      // 移除括号及其中的内容
      return entryInfo.replace(/\([^)]*\)/g, '').trim();
    };
    
    // 确保formatDateTime函数存在
    const safeFormatDateTime = (date) => {
      if (!date) return '';
      try {
        return formatDateTime(date);
      } catch (e) {
        console.error('日期格式化错误:', e);
        return date.toString();
      }
    };
    
    // 映射数据，确保每个字段都有值
    const data = filteredRecords.map(record => ({
      '车牌号': record.plate_number || '',
      '免费原因': record.free_reason || '',
      '车型': record.vehicle_type || '',
      '轴数': record.axle_count || '',
      '吨位': record.tonnage || '',
      '入口信息': processEntryInfo(record.entry_info),
      '收费员': record.toll_collector || '',
      '监控员': record.monitor || '',
      '收费站': record.station_name || '',
      '金额': record.amount || 0,
      '登记时间': safeFormatDateTime(record.created_at)
    }));
    
    // 检查data数组是否为空
    if (data.length === 0) {
      showAlert('处理后的数据为空，无法导出', 'error');
      return;
    }
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(data);
    
    // 只有当ws['!ref']存在时才进行样式设置
    if (ws['!ref']) {
      // 计算每列的最大宽度
      const calculateColumnWidths = () => {
        try {
          // 获取列标题
          if (data.length === 0) return [];
          
          const headers = Object.keys(data[0]);
          // 初始化每列的宽度为标题宽度
          const columnWidths = headers.map(header => {
            // 中文每个字符宽度约为2.5，英文和数字约为1
            const charCount = [...header].reduce((sum, char) => {
              return sum + (char.match(/[\u4e00-\u9fa5]/) ? 2.5 : 1);
            }, 0);
            return Math.max(charCount, 8); // 最小宽度为8
          });
          
          // 遍历数据，更新每列最大宽度
          data.forEach(row => {
            headers.forEach((header, colIndex) => {
              const cellValue = row[header].toString();
              const charCount = [...cellValue].reduce((sum, char) => {
                return sum + (char.match(/[\u4e00-\u9fa5]/) ? 2.5 : 1);
              }, 0);
              columnWidths[colIndex] = Math.max(columnWidths[colIndex], charCount);
            });
          });
          
          return columnWidths;
        } catch (e) {
          console.error('计算列宽错误:', e);
          return [];
        }
      };
      
      // 设置列宽自适应
      const columnWidths = calculateColumnWidths();
      if (columnWidths.length > 0) {
        const wscols = columnWidths.map(width => ({
          wch: Math.ceil(width) + 2 // 增加2个单位的边距
        }));
        ws['!cols'] = wscols;
      }
      
      // 创建居中样式
      const centerStyle = {
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        }
      };
      
      try {
        // 设置所有单元格（包括表头）内容居中
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            
            // 确保单元格对象存在
            if (!ws[cell_ref]) {
              ws[cell_ref] = { t: 's', v: '' };
            }
            
            // 设置样式为居中
            ws[cell_ref].s = centerStyle;
          }
        }
      } catch (e) {
        console.error('设置单元格样式错误:', e);
        // 继续执行，不影响导出
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '登记记录');
    
    const filename = `免费车登记记录_${formatDate(new Date())}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    showAlert('导出成功', 'success');
  } catch (error) {
    console.error('导出Excel失败:', error);
    showAlert(`导出失败: ${error.message || '未知错误'}`, 'error');
  }
}


// 更新登记记录页面的收费站选项
function updateRecordStationOptions() {
  updateStationOptions('record-company-filter', 'record-station-filter', allStations);
}

// 初始化记录筛选器
function initRecordsFilters() {
    const recordCompanyFilter = document.getElementById('record-company-filter');
    const recordStationFilter = document.getElementById('record-station-filter');

    if (recordCompanyFilter) {
        if (allCompanies.length > 0) {
            recordCompanyFilter.innerHTML = '<option value="">所有分公司</option>';
            allCompanies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = company.name;
                recordCompanyFilter.appendChild(option);
            });
        }

        recordCompanyFilter.addEventListener('change', () => {
            updateRecordStationOptions();
            filterAndRenderRecords();
        });
    }

    if (recordStationFilter) {
        updateRecordStationOptions();
        recordStationFilter.addEventListener('change', filterAndRenderRecords);
    }
}
