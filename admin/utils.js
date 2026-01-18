// ==================== 工具函数 ====================

// 日期格式化缓存，减少重复计算
const dateFormatCache = new Map();

// 缓存当前日期和月份信息，减少重复创建Date对象
let todayCache = {
  date: null,
  toDateString: '',
  year: 0,
  month: 0
};

// 更新缓存的当前日期信息
function updateTodayCache() {
  const now = new Date();
  todayCache = {
    date: now,
    toDateString: now.toDateString(),
    year: now.getFullYear(),
    month: now.getMonth()
  };
}

// 初始化缓存
updateTodayCache();

// 每小时更新一次缓存，确保日期准确性
setInterval(updateTodayCache, 3600000);

function showModal(title, body, onSubmit, cancelText = '取消') {
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-body').innerHTML = body
  document.getElementById('modal').classList.add('active')
  
  const submitBtn = document.getElementById('modal-submit')
  submitBtn.onclick = onSubmit
  submitBtn.style.display = onSubmit ? 'block' : 'none'
  
  // 修改取消按钮文本
  const cancelBtn = document.querySelector('.modal-footer .btn-secondary')
  cancelBtn.textContent = cancelText
  cancelBtn.onclick = closeModal
}

function closeModal() {
  document.getElementById('modal').classList.remove('active')
}

function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div')
  alertDiv.className = `alert alert-${type}`
  alertDiv.textContent = message
  
  document.querySelector('.content-area').insertBefore(alertDiv, document.querySelector('.content-area').firstChild)
  
  setTimeout(() => {
    alertDiv.remove()
  }, 3000)
}

// 优化的日期时间格式化函数，使用缓存
function formatDateTime(dateStr) {
  if (!dateStr) return '-'  
  
  // 检查缓存中是否已经有格式化结果
  if (dateFormatCache.has(dateStr)) {
    return dateFormatCache.get(dateStr);
  }
  
  try {
    const date = new Date(dateStr);
    const formatted = date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // 将结果存入缓存
    dateFormatCache.set(dateStr, formatted);
    return formatted;
  } catch (e) {
    console.error('日期格式化错误:', e);
    return '-';
  }
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

// 优化的isToday函数，使用缓存
function isToday(dateStr) {
  if (!dateStr) return false;
  
  // 检查缓存中是否已经有结果
  const cacheKey = `today_${dateStr}`;
  if (dateFormatCache.has(cacheKey)) {
    return dateFormatCache.get(cacheKey);
  }
  
  try {
    const date = new Date(dateStr);
    const result = date.toDateString() === todayCache.toDateString;
    
    // 将结果存入缓存
    dateFormatCache.set(cacheKey, result);
    return result;
  } catch (e) {
    console.error('日期比较错误:', e);
    return false;
  }
}

// 优化的isThisMonth函数，使用缓存
function isThisMonth(dateStr) {
  if (!dateStr) return false;
  
  // 检查缓存中是否已经有结果
  const cacheKey = `month_${dateStr}`;
  if (dateFormatCache.has(cacheKey)) {
    return dateFormatCache.get(cacheKey);
  }
  
  try {
    const date = new Date(dateStr);
    const result = date.getMonth() === todayCache.month && date.getFullYear() === todayCache.year;
    
    // 将结果存入缓存
    dateFormatCache.set(cacheKey, result);
    return result;
  } catch (e) {
    console.error('月份比较错误:', e);
    return false;
  }
}

// 点击模态框外部关闭
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') {
    closeModal()
  }
})

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '未知大小';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 显示加载状态
function showLoading() {
  const loadingHTML = `
    <div class="loading-backdrop">
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">加载中...</div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', loadingHTML);
  document.body.style.overflow = 'hidden';
}

// 隐藏加载状态
function hideLoading() {
  const backdrop = document.querySelector('.loading-backdrop');
  if (backdrop) {
    backdrop.remove();
    document.body.style.overflow = '';
  }
}

// 暴露到全局作用域
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// 显示图片模态框
function showImageModal(imageUrl) {
  const modalHTML = `
    <div class="modal-backdrop" onclick="hideImageModal()">
      <div class="image-modal" onclick="event.stopPropagation()">
        <button class="image-modal-close" onclick="hideImageModal()">&times;</button>
        <img src="${imageUrl}" alt="大图预览" class="image-modal-preview" />
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.body.style.overflow = 'hidden';
}

// 隐藏图片模态框
function hideImageModal() {
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.remove();
    document.body.style.overflow = '';
  }
}

// 数据缓存机制
const utilsDataCache = new Map();
const utilsCacheExpiry = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 缓存有效期：5分钟

// 获取缓存数据
function getCachedData(key) {
  if (!utilsDataCache.has(key)) {
    return null;
  }
  
  const expiry = utilsCacheExpiry.get(key);
  if (expiry && Date.now() > expiry) {
    // 缓存已过期，清除缓存
    utilsDataCache.delete(key);
    utilsCacheExpiry.delete(key);
    return null;
  }
  
  return utilsDataCache.get(key);
}

// 更新缓存数据
function updateCache(key, data) {
  utilsDataCache.set(key, data);
  utilsCacheExpiry.set(key, Date.now() + CACHE_DURATION);
}

// 清除缓存数据
function clearCache(key) {
  if (key) {
    utilsDataCache.delete(key);
    utilsCacheExpiry.delete(key);
  } else {
    // 清除所有缓存
    utilsDataCache.clear();
    utilsCacheExpiry.clear();
  }
}

// 暴露到全局作用域
window.showImageModal = showImageModal;
window.hideImageModal = hideImageModal;
window.getCachedData = getCachedData;
window.updateCache = updateCache;
window.clearCache = clearCache;
