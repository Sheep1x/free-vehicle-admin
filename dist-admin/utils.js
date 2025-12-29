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
    const result = date.toDateString() === todayCache.toDateString();
    
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
