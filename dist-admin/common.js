// ==================== 通用工具模块 ====================

/**
 * 显示全局加载指示器
 * @param {string} text - 加载提示文字
 */
function showGlobalLoader(text = '加载中...') {
  const loader = document.getElementById('global-loader');
  const loaderText = document.getElementById('loader-text');
  if (loader) {
    loader.style.display = 'flex';
    if (loaderText) {
      loaderText.textContent = text;
    }
  }
}

/**
 * 隐藏全局加载指示器
 */
function hideGlobalLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.style.display = 'none';
  }
}

/**
 * 应用角色权限过滤
 * @param {Object} query - Supabase查询对象
 * @param {string} userType - 用户类型: 'collector', 'monitor', 'group', 'station'
 * @param {Object} currentUser - 当前用户对象
 * @param {Array} allStations - 所有收费站数组
 * @param {Array} allGroups - 所有班组数组
 * @returns {Object} 过滤后的查询对象
 */
function applyRoleBasedFilter(query, userType, currentUser, allStations = [], allGroups = []) {
  if (!currentUser) {
    return query;
  }

  // 权限等级判断：公司管理员 > 信调中心管理员/收费站管理员
  const isCompanyLevelAccess = currentUser.role === 'company_admin';
  
  // 信调中心管理员和收费站管理员都具有相同的权限级别，使用各自的过滤逻辑

  switch (currentUser.role) {
    case 'company_admin':
      if (isCompanyLevelAccess) {
        // 分公司管理员只能看到自己分公司下的数据
        const companyStationIds = allStations.map(station => station.id);
        
        switch (userType) {
          case 'collector':
            const companyGroups = allGroups.map(group => group.id);
            // 即使没有权限访问任何数据，也返回一个空的查询，而不是null
            return companyGroups.length > 0 ? query.in('group_id', companyGroups) : query.in('group_id', []);
          
          case 'monitor':
          case 'station':
            // 即使没有权限访问任何数据，也返回一个空的查询，而不是null
            return companyStationIds.length > 0 ? query.in('station_id', companyStationIds) : query.in('station_id', []);
          
          case 'group':
            // 即使没有权限访问任何数据，也返回一个空的查询，而不是null
            return companyStationIds.length > 0 ? query.in('station_id', companyStationIds) : query.in('station_id', []);
          
          default:
            return query;
        }
      }
      break;
      
    case 'station_admin':
    case 'centers_admin':
      // 收费站管理员和信调中心管理员权限平级
      // 普通收费站管理员只能看到自己收费站下的数据
      // 信调中心管理员可以看到自己分公司下的所有数据
      if (currentUser.role === 'centers_admin') {
        // 信调中心管理员可以看到自己分公司下的所有数据
        const companyStationIds = allStations.filter(station => station.company_id === currentUser.company_id)
                                            .map(station => station.id);
        
        switch (userType) {
          case 'collector':
            const companyGroups = allGroups.filter(group => companyStationIds.includes(group.station_id))
                                          .map(group => group.id);
            // 即使没有权限访问任何数据，也返回一个空的查询，而不是null
            return companyGroups.length > 0 ? query.in('group_id', companyGroups) : query.in('group_id', []);
          
          case 'monitor':
          case 'station':
            // 即使没有权限访问任何数据，也返回一个空的查询，而不是null
            return companyStationIds.length > 0 ? query.in('station_id', companyStationIds) : query.in('station_id', []);
          
          case 'group':
            // 即使没有权限访问任何数据，也返回一个空的查询，而不是null
            return companyStationIds.length > 0 ? query.in('station_id', companyStationIds) : query.in('station_id', []);
          
          default:
            return query;
        }
      } else {
        // 普通收费站管理员只能看到自己收费站下的数据
        switch (userType) {
          case 'collector':
            const stationGroups = allGroups.filter(group => group.station_id === currentUser.station_id)
                                          .map(group => group.id);
            // 即使没有权限访问任何数据，也返回一个空的查询，而不是null
            return stationGroups.length > 0 ? query.in('group_id', stationGroups) : query.in('group_id', []);
          
          case 'monitor':
          case 'station':
            return query.eq('station_id', currentUser.station_id);
          
          case 'group':
            return query.eq('station_id', currentUser.station_id);
          
          default:
            return query;
        }
      }
    
    default:
      // 超级管理员可以看到所有数据
      return query;
  }
}

/**
 * 数据缓存对象
 * key: tableName
 * value: { data: 缓存数据, timestamp: 缓存时间, expires: 过期时间(毫秒) }
 */
const dataCache = {};

/**
 * 通用的数据加载函数（带缓存）
 * @param {string} tableName - 表名
 * @param {Array} selectFields - 查询字段
 * @param {string} userType - 用户类型
 * @param {Object} currentUser - 当前用户
 * @param {Array} allStations - 所有收费站
 * @param {Array} allGroups - 所有班组
 * @param {Array} targetArray - 目标数组（用于存储数据）
 * @param {string} orderBy - 排序字段
 * @param {boolean} ascending - 是否升序
 * @param {number} cacheExpiry - 缓存过期时间（毫秒，默认5分钟）
 * @param {boolean} forceRefresh - 是否强制刷新数据
 */
async function loadCommonData(tableName, selectFields, userType, currentUser, allStations, allGroups, targetArray, orderBy = 'created_at', ascending = false, cacheExpiry = 300000, forceRefresh = false) {
  try {
    // 检查缓存
    const now = Date.now();
    const cachedData = dataCache[tableName];
    
    // 如果缓存存在且未过期，并且不是强制刷新，则直接使用缓存数据
    if (cachedData && cachedData.data && now < cachedData.expires && !forceRefresh) {
      // 直接使用缓存数据，不清空数组，提高性能
      targetArray.length = 0;
      targetArray.push(...cachedData.data);
      return;
    }
    
    // 缓存不存在或已过期，重新加载数据
    let query = window.supabase
      .from(tableName)
      .select(selectFields)
      .order(orderBy, { ascending });

    // 应用角色权限过滤
    query = applyRoleBasedFilter(query, userType, currentUser, allStations, allGroups);
    
    if (!query) {
      targetArray.length = 0; // 清空数组
      return;
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    // 更新目标数组
    targetArray.length = 0; // 清空数组
    targetArray.push(...(data || [])); // 添加新数据
    
    // 更新缓存
    dataCache[tableName] = {
      data: data || [],
      timestamp: now,
      expires: now + cacheExpiry
    };
  } catch (error) {
    console.error(`加载${tableName}失败:`, error);
    targetArray.length = 0;
  }
}

/**
 * 清除指定表的缓存
 * @param {string} tableName - 表名，不传则清除所有缓存
 */
function clearCache(tableName) {
  if (tableName) {
    delete dataCache[tableName];
  } else {
    // 清除所有缓存
    Object.keys(dataCache).forEach(key => {
      delete dataCache[key];
    });
  }
}

/**
 * 通用的筛选函数
 * @param {Array} data - 原始数据数组
 * @param {string} searchKey - 搜索字段名
 * @param {string} searchValue - 搜索值
 * @param {string} companyKey - 分公司字段名
 * @param {string} companyValue - 分公司筛选值
 * @param {string} stationKey - 收费站字段名
 * @param {string} stationValue - 收费站筛选值
 * @param {string} groupKey - 班组字段名
 * @param {string} groupValue - 班组筛选值
 * @returns {Array} 筛选后的数组
 */
function filterCommonData(data, searchKey, searchValue, companyKey = '', companyValue = '', stationKey = '', stationValue = '', groupKey = '', groupValue = '') {
  return data.filter(item => {
    // 搜索筛选
    if (searchValue && !item[searchKey]?.toLowerCase().includes(searchValue.toLowerCase())) {
      return false;
    }
    
    // 分公司筛选
    if (companyValue && companyKey && item[companyKey] !== companyValue) {
      return false;
    }
    
    // 收费站筛选
    if (stationValue && stationKey) {
      if (stationKey.includes('.')) {
        // 支持嵌套字段，如 'toll_stations.name'
        const keys = stationKey.split('.');
        let stationValue = item;
        for (const key of keys) {
          stationValue = stationValue?.[key];
        }
        if (stationValue !== stationValue) {
          return false;
        }
      } else if (item[stationKey] !== stationValue) {
        return false;
      }
    }
    
    // 班组筛选
    if (groupValue && groupKey && item[groupKey] !== groupValue) {
      return false;
    }
    
    return true;
  });
}

/**
 * 通用的表格渲染函数（支持分页）
 * @param {string} containerId - 容器ID
 * @param {Array} data - 数据数组
 * @param {Array} columns - 列配置 [{key, label, formatter}]
 * @param {Array} actions - 操作按钮配置 [{label, onClick, class}]
 * @param {string} emptyMessage - 空数据提示信息
 * @param {Object} pagination - 分页配置 {page: 当前页, pageSize: 每页条数}
 */
function renderCommonTable(containerId, data, columns, actions = [], emptyMessage = '暂无数据', pagination = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>${emptyMessage}</p>
      </div>
    `;
    return;
  }

  // 默认分页配置
  const { page = 1, pageSize = 20 } = pagination;
  
  // 计算分页数据
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);
  const totalPages = Math.ceil(data.length / pageSize);
  const hasPagination = totalPages > 1;

  let tableHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.label}</th>`).join('')}
            ${actions.length > 0 ? '<th>操作</th>' : ''}
          </tr>
        </thead>
        <tbody>
  `;

  paginatedData.forEach(item => {
    tableHTML += '<tr>';
    columns.forEach(col => {
      let value = item[col.key];
      if (col.formatter && typeof col.formatter === 'function') {
        value = col.formatter(value, item);
      }
      tableHTML += `<td>${value || '-'}</td>`;
    });
    
    if (actions.length > 0) {
      tableHTML += '<td><div class="action-buttons">';
      actions.forEach(action => {
        const buttonClass = action.class || 'btn btn-primary btn-sm';
        tableHTML += `<button class="${buttonClass}" onclick="${action.onClick}('${item.id}')">${action.label}</button>`;
      });
      tableHTML += '</div></td>';
    }
    
    tableHTML += '</tr>';
  });

  tableHTML += '</tbody></table>';
  
  // 添加分页控件
  if (hasPagination) {
    tableHTML += `
      <div class="pagination">
        <button class="pagination-btn" onclick="changePage(${page - 1})" ${page === 1 ? 'disabled' : ''}>
          &laquo; 上一页
        </button>
        <span class="pagination-info">
          第 ${page} / ${totalPages} 页，共 ${data.length} 条记录
        </span>
        <button class="pagination-btn" onclick="changePage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
          下一页 &raquo;
        </button>
      </div>
    `;
  } else {
    // 显示总记录数
    tableHTML += `
      <div class="pagination-info">
        共 ${data.length} 条记录
      </div>
    `;
  }
  
  tableHTML += '</div>';
  container.innerHTML = tableHTML;
}

// 分页切换函数（需要在调用页面中定义具体实现）
function changePage(page) {
  // 这个函数会被具体页面覆盖实现
  console.warn('changePage function not implemented in current page');
}

/**
 * 通用的模态框显示函数
 * @param {string} title - 模态框标题
 * @param {Array} fields - 表单字段配置 [{label, name, type, required, options}]
 * @param {Function} onSubmit - 提交回调函数
 * @param {Object} data - 编辑时的初始数据
 */
function showCommonModal(title, fields, onSubmit, data = null) {
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalSubmit = document.getElementById('modal-submit');

  modalTitle.textContent = title;

  let formHTML = '';
  fields.forEach(field => {
    const value = data ? data[field.name] : '';
    const required = field.required ? 'required' : '';
    
    formHTML += `
      <div class="form-group">
        <label for="${field.name}">${field.label}</label>
    `;

    switch (field.type) {
      case 'select':
        formHTML += `
          <select id="${field.name}" class="form-control" ${required}>
            ${field.options.map(opt => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
          </select>
        `;
        break;
      
      case 'textarea':
        formHTML += `
          <textarea id="${field.name}" class="form-control" ${required}>${value}</textarea>
        `;
        break;
      
      default:
        formHTML += `
          <input type="${field.type || 'text'}" id="${field.name}" class="form-control" value="${value}" ${required}>
        `;
    }

    formHTML += '</div>';
  });

  modalBody.innerHTML = formHTML;
  modalSubmit.onclick = onSubmit;
  modalSubmit.dataset.editId = data ? data.id : '';

  document.getElementById('modal').classList.add('active');
}

/**
 * 通用的下拉框初始化函数
 * @param {string} selectId - 下拉框ID
 * @param {Array} data - 数据数组
 * @param {string} valueField - 值字段名
 * @param {string} labelField - 显示字段名
 * @param {string} defaultOption - 默认选项文本
 */
function initCommonSelect(selectId, data, valueField, labelField, defaultOption = '请选择') {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = `<option value="">${defaultOption}</option>`;
  
  if (data && data.length > 0) {
    data.forEach(item => {
      const option = document.createElement('option');
      option.value = item[valueField];
      option.textContent = item[labelField];
      select.appendChild(option);
    });
  }
}

/**
 * 通用的收费站下拉框更新函数（参考登记记录页面实现）
 * @param {string} companySelectId - 分公司下拉框ID
 * @param {string} stationSelectId - 收费站下拉框ID
 * @param {Array} allStationsData - 所有收费站数据
 * @param {Function} [callback] - 可选回调函数，用于更新后续下拉框（如班组）
 */
function updateStationOptions(companySelectId, stationSelectId, allStationsData, callback) {
  const companyFilter = document.getElementById(companySelectId);
  const stationFilter = document.getElementById(stationSelectId);
  
  if (companyFilter && stationFilter) {
    const selectedCompanyId = companyFilter.value;
    
    // 清空现有选项
    stationFilter.innerHTML = '<option value="">所有收费站</option>';
    
    // 根据选中的分公司筛选收费站
    let filteredStations = allStationsData;
    if (selectedCompanyId) {
      filteredStations = allStationsData.filter(station => station.company_id === selectedCompanyId);
    }
    
    // 添加收费站选项
    filteredStations.forEach(station => {
        const option = document.createElement('option');
        option.value = station.id;
        option.textContent = station.name;
        stationFilter.appendChild(option);
    });
    
    // 如果提供了回调函数，调用它（用于更新后续的下拉框，如班组）
    if (typeof callback === 'function') {
      callback();
    }
  }
}