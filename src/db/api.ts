// 导入真实的 Supabase 客户端
import {supabase} from '@/client/supabase'

// 收费员类型
export interface Collector {
  id: string
  name: string
  code: string
}

// 监控员类型
export interface Monitor {
  id: string
  name: string
  code: string
}

// 班次设置类型
export interface ShiftSetting {
  id: string
  start_time: string
  end_time: string
  name: string
}

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

// 获取所有收费员
export async function getAllCollectors(): Promise<Collector[]> {
  try {
    const {data, error} = await supabase
      .from('toll_collectors_info')
      .select('id, name, code')
      .order('created_at', {ascending: false})

    if (error) {
      console.error('获取收费员失败:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('获取收费员异常:', error)
    return []
  }
}

// 获取所有监控员
export async function getAllMonitors(): Promise<Monitor[]> {
  try {
    const {data, error} = await supabase
      .from('monitors_info')
      .select('id, name, code')
      .order('created_at', {ascending: false})

    if (error) {
      console.error('获取监控员失败:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('获取监控员异常:', error)
    return []
  }
}

// 获取班次设置
export async function getShiftSettings(): Promise<ShiftSetting[]> {
  try {
    const {data, error} = await supabase
      .from('shift_settings')
      .select('id, start_time, end_time, shift_name')
      .order('shift_name')

    if (error) {
      console.error('获取班次设置失败:', error)
      return []
    }

    // 将shift_name映射为name，确保接口一致性
    return (data || []).map((shift) => ({
      id: shift.id,
      start_time: shift.start_time,
      end_time: shift.end_time,
      name: shift.shift_name || ''
    }))
  } catch (error) {
    console.error('获取班次设置异常:', error)
    return []
  }
}

// 获取当前班次
export function getCurrentShift(shifts: ShiftSetting[]): string {
  // 获取当前时间
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  // 查找当前时间所属的班次
  const currentShift = shifts.find((shift) => {
    // 处理跨天班次（如夜班23:30-07:30）
    if (shift.end_time < shift.start_time) {
      // 跨天班次：当前时间 >= 开始时间 或者 当前时间 < 结束时间
      return currentTime >= shift.start_time || currentTime < shift.end_time
    } else {
      // 正常班次：当前时间 >= 开始时间 并且 当前时间 < 结束时间
      return currentTime >= shift.start_time && currentTime < shift.end_time
    }
  })

  return currentShift ? currentShift.name : '未设置'
}

// 创建收费记录
export async function createTollRecord(record: Omit<TollRecord, 'id' | 'created_at'>): Promise<TollRecord | null> {
  try {
    const {data, error} = await supabase.from('toll_records').insert([record]).select().single()

    if (error) {
      console.error('创建收费记录失败:', error)
      return null
    }

    return data as TollRecord
  } catch (error) {
    console.error('创建收费记录异常:', error)
    return null
  }
}

// 获取所有收费记录
export async function getAllTollRecords(): Promise<TollRecord[]> {
  try {
    const {data, error} = await supabase.from('toll_records').select('*').order('created_at', {ascending: false})

    if (error) {
      console.error('获取收费记录失败:', error)
      return []
    }

    return data as TollRecord[]
  } catch (error) {
    console.error('获取收费记录异常:', error)
    return []
  }
}

// 根据车牌号获取收费记录
export async function getTollRecordsByPlateNumber(plateNumber: string): Promise<TollRecord[]> {
  try {
    const {data, error} = await supabase
      .from('toll_records')
      .select('*')
      .ilike('plate_number', `%${plateNumber}%`)
      .order('created_at', {ascending: false})

    if (error) {
      console.error('根据车牌号获取收费记录失败:', error)
      return []
    }

    return data as TollRecord[]
  } catch (error) {
    console.error('根据车牌号获取收费记录异常:', error)
    return []
  }
}

// 删除收费记录
export async function deleteTollRecords(ids: string[]): Promise<boolean> {
  try {
    const {error} = await supabase.from('toll_records').delete().in('id', ids)

    if (error) {
      console.error('删除收费记录失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('删除收费记录异常:', error)
    return false
  }
}
