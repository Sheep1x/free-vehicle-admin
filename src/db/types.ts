// 免费车登记记录类型定义
export interface TollRecord {
  id: string
  plate_number: string | null
  vehicle_type: string | null
  axle_count: string | null
  tonnage: string | null
  entry_info: string | null
  entry_time: string | null
  amount: number | null
  image_url: string | null
  free_reason: string | null // 免费原因
  toll_collector: string | null // 收费员
  monitor: string | null // 监控员
  created_at: string
}

// 创建记录时的输入类型
export interface CreateTollRecordInput {
  plate_number?: string
  vehicle_type?: string
  axle_count?: string
  tonnage?: string
  entry_info?: string
  entry_time?: string
  amount?: number
  image_url?: string
  free_reason?: string
  toll_collector?: string
  monitor?: string
}
