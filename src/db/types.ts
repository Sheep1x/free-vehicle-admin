// 收费记录类型
export interface TollRecord {
  id: string
  plate_number: string
  vehicle_type: string
  axle_count: string
  tonnage: string
  entry_info: string
  entry_time: string
  amount: number | undefined
  image_url: string
  free_reason: string
  toll_collector: string
  monitor: string
  created_at: string
}

// 收费记录图片类型
export interface TollRecordImage {
  id: string
  record_id: string
  image_url: string
  file_name: string
  file_size: number
  file_format: string
  uploader: string
  created_at: string
  updated_at: string
}

// 管理员用户类型
export interface AdminUser {
  id: string
  username: string
  password: string
  role: 'super_admin' | 'company_admin' | 'station_admin'
  company_id: string | null
  station_id: string | null
  created_at: string
  updated_at: string
}

// 收费站类型
export interface TollStation {
  id: string
  name: string
  code: string
  company_id: string
  created_at: string
  updated_at: string
}

// 登录响应类型
export interface LoginResponse {
  success: boolean
  user?: AdminUser
  message?: string
}
