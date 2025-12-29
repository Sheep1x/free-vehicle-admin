// ==================== 登记记录管理 ====================

// 缓存收费员到收费站的映射表
let collectorToStationMap = new Map();

// 预构建收费员到收费站的映射表
function buildCollectorToStationMap() {
  collectorToStationMap.clear();
  
  if (!allCollectors || allCollectors.length === 0) {
    return;
  }
  
  allCollectors.forEach(collector => {
    let stationName = '未知';
    let stationId = '';
    
    if (collector?.toll_groups?.toll_stations?.name) {
      stationName = collector.toll_groups.toll_stations.name;
      stationId = collector.toll_groups.station_id || collector.toll_groups.toll_stations.id || '';
    } else if (collector?.toll_groups?.station_id && allStations?.length > 0) {
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
    
    const collectorKey = `${collector.code}_${collector.name}`;
    collectorToStationMap.set(collectorKey, { stationName, stationId });
  });
}

async function loadRecords(pagination = {}) {
  try {
    const { page = 1, pageSize = 20 } = pagination;
    
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
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      allRecords = [];
      filteredRecords = [];
      return;
    }
    
    const recordsWithStation = data.map(record => {
      let stationName = '未知';
      let stationId = '';
      
      const parts = record.toll_collector?.split(' ');
      if (parts && parts.length >= 2) {
        const employeeId = parts[0];
        const name = parts[1];
        const collectorKey = `${employeeId}_${name}`;
        
        if (collectorToStationMap.has(collectorKey)) {
          const stationInfo = collectorToStationMap.get(collectorKey);
          stationName = stationInfo.stationName;
          stationId = stationInfo.stationId;
        } else if (allCollectors && allCollectors.length > 0) {
          const collector = allCollectors.find(c => c.code === employeeId || c.name === name);
          if (collector?.toll_groups?.toll_stations?.name) {
            stationName = collector.toll_groups.toll_stations.name;
            stationId = collector.toll_groups.station_id || collector.toll_groups.toll_stations.id || '';
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
        
        if (companyStationIds.length > 0) {
          filteredByRole = recordsWithStation.filter(record => 
            !record.station_id || companyStationIds.includes(record.station_id)
          );
        }
      } else if (currentUser.role === 'station_admin') {
        filteredByRole = recordsWithStation.filter(record => 
          !record.station_id || record.station_id === currentUser.station_id
        );
      }
    }
    
    allRecords = filteredByRole || [];
    filteredRecords = [...allRecords];
  } catch (error) {
    console.error('加载记录失败:', error);
    showAlert(`加载记录失败: ${error.message || '未知错误'}`, 'error');
    allRecords = [];
    filteredRecords = [];
  }
}

function applyDateFilter() {
  startDate = document.getElementById('start-date').value;
  endDate = document.getElementById('end-date').value;
  
  if (startDate && endDate && endDate < startDate) {
    showModal('🎉 恭喜您触发彩蛋！', `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin: 20px 0;">😁</div>
        <h3 style="color: #4f46e5; margin: 20px 0;">获得「没有脑子」称号！</h3>
        <p style="font-size: 18px; color: #64748b; margin: 20px 0;">该称号将为所有用户播报！</p>
        <p style="font-size: 14px; color: #94a3b8; margin-top: 30px;">提示：结束日期不能早于开始日期哦~</p>
      </div>
    `, null, '拾取脑子');
    return;
  }
  
  loadAllData();
}

function clearDateFilter() {
  document.getElementById('start-date').value = '';
  document.getElementById('end-date').value = '';
  startDate = '';
  endDate = '';
  
  loadAllData();
}

async function loadAllData() {
  await loadCompanies();
  await loadStations();
  await loadGroups();
  await loadCollectors();
  
  buildCollectorToStationMap();
  await loadRecords();
  
  filterAndRenderRecords();
  updateStats();
}

function filterAndRenderRecords() {
  const keyword = document.getElementById('search-records')?.value?.toLowerCase() || '';
  const companyFilter = document.getElementById('record-company-filter');
  const stationFilter = document.getElementById('record-station-filter');

  let tempFilteredRecords = allRecords;

  if (keyword) {
    tempFilteredRecords = tempFilteredRecords.filter(record => 
      (record.plate_number && record.plate_number.toLowerCase().includes(keyword)) ||
      (record.free_reason && record.free_reason.toLowerCase().includes(keyword)) ||
      (record.toll_collector && record.toll_collector.toLowerCase().includes(keyword)) ||
      (record.monitor && record.monitor.toLowerCase().includes(keyword))
    );
  }

  if (companyFilter && companyFilter.value) {
    const selectedCompanyId = companyFilter.value;
    const stationIds = allStations.filter(s => s.company_id === selectedCompanyId).map(s => s.id);
    tempFilteredRecords = tempFilteredRecords.filter(r => stationIds.includes(r.station_id));
  }

  if (stationFilter && stationFilter.value) {
    tempFilteredRecords = tempFilteredRecords.filter(record => record.station_id === stationFilter.value);
  }

  filteredRecords = tempFilteredRecords || [];
  renderRecords();
  updateStats();
}

function renderRecords(pagination = {}) {
  const { page = 1, pageSize = 20 } = pagination;
  const container = document.getElementById('records-table-container');
  
  if (!filteredRecords || filteredRecords.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>暂无登记记录</p>
      </div>
    `;
    return;
  }
  
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  
  let tableHTML = `
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
        ${paginatedRecords.map(record => `
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
                ${(currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'company_admin')) ? `
                  <button class="btn btn-sm btn-danger" onclick="deleteRecord('${record.id}')">删除</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  if (totalPages > 1) {
    tableHTML += `
      <div class="pagination">
        <button class="pagination-btn" onclick="changePage(${page - 1})" ${page === 1 ? 'disabled' : ''}>
          &laquo; 上一页
        </button>
        <span class="pagination-info">
          第 ${page} / ${totalPages} 页，共 ${filteredRecords.length} 条记录
        </span>
        <button class="pagination-btn" onclick="changePage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
          下一页 &raquo;
        </button>
      </div>
    `;
  } else {
    tableHTML += `
      <div class="pagination-info">
        共 ${filteredRecords.length} 条记录
      </div>
    `;
  }
  
  container.innerHTML = tableHTML;
}

function updateStats() {
  const total = allRecords ? allRecords.length : 0;
  const today = allRecords ? allRecords.filter(r => isToday(r.created_at)).length : 0;
  const month = allRecords ? allRecords.filter(r => isThisMonth(r.created_at)).length : 0;
  
  const totalEl = document.getElementById('total-records');
  const todayEl = document.getElementById('today-records');
  const monthEl = document.getElementById('month-records');
  
  if (totalEl) totalEl.textContent = total;
  if (todayEl) todayEl.textContent = today;
  if (monthEl) monthEl.textContent = month;
}

async function deleteRecord(id) {
  if (!confirm('确定要删除这条记录吗？')) return;
  
  try {
    const { error } = await window.supabase
      .from('toll_records')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    showAlert('删除成功', 'success');
    await loadRecords();
    renderRecords();
    updateStats();
  } catch (error) {
    console.error('删除失败:', error);
    showAlert('删除失败', 'error');
  }
}

function viewRecord(id) {
  const record = allRecords ? allRecords.find(r => r.id === id) : null;
  if (!record) return;
  
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
  `;
  
  showModal('查看记录详情', modalBody, null);
}

function exportToExcel() {
  try {
    if (!filteredRecords || filteredRecords.length === 0) {
      showAlert('暂无数据可导出', 'error');
      return;
    }
    
    const processEntryInfo = (entryInfo) => {
      if (!entryInfo) return '';
      return entryInfo.replace(/\([^)]*\)/g, '').trim();
    };
    
    const safeFormatDateTime = (date) => {
      if (!date) return '';
      try {
        return formatDateTime(date);
      } catch (e) {
        console.error('日期格式化错误:', e);
        return date.toString();
      }
    };
    
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
    
    if (data.length === 0) {
      showAlert('处理后的数据为空，无法导出', 'error');
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(data);
    
    if (ws['!ref']) {
      const calculateColumnWidths = () => {
        try {
          if (data.length === 0) return [];
          
          const headers = Object.keys(data[0]);
          const columnWidths = headers.map(header => {
            const charCount = [...header].reduce((sum, char) => {
              return sum + (char.match(/[\u4e00-\u9fa5]/) ? 2.5 : 1);
            }, 0);
            return Math.max(charCount, 8);
          });
          
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
      
      const columnWidths = calculateColumnWidths();
      if (columnWidths.length > 0) {
        const wscols = columnWidths.map(width => ({
          wch: Math.ceil(width) + 2
        }));
        ws['!cols'] = wscols;
      }
      
      const centerStyle = {
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        }
      };
      
      try {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            
            if (!ws[cell_ref]) {
              ws[cell_ref] = { t: 's', v: '' };
            }
            
            ws[cell_ref].s = centerStyle;
          }
        }
      } catch (e) {
        console.error('设置单元格样式错误:', e);
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

function updateRecordStationOptions() {
  updateStationOptions('record-company-filter', 'record-station-filter', allStations);
}

function initRecordsFilters() {
  const recordCompanyFilter = document.getElementById('record-company-filter');
  const recordStationFilter = document.getElementById('record-station-filter');

  if (recordCompanyFilter) {
    if (allCompanies && allCompanies.length > 0) {
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
