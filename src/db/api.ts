// 导入真实的 Supabase 客户端
import {supabase} from '@/client/supabase'
import Taro from '@tarojs/taro'

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

// 上传收费记录图片
export async function uploadRecordImage(recordId: string, fileOrPath: File | string, uploader: string): Promise<TollRecordImage | null> {
  try {
    let fileName: string
    let fileSize: number
    let fileFormat: string
    let imageUrl: string

    if (typeof fileOrPath === 'string') {
      // 微信小程序：使用本地路径上传到Supabase Storage
      // 生成唯一的文件名
      const timestamp = new Date().getTime()
      const originalFileName = fileOrPath.split('/').pop() || `image.jpg`
      fileFormat = originalFileName.split('.').pop() || 'jpg'
      fileName = `${timestamp}-${originalFileName}`
      fileSize = 0 // 微信小程序中无法直接获取文件大小
      
      try {
        // 使用微信小程序的上传API上传图片
        console.log('微信小程序环境：开始上传图片到Supabase Storage')
        
        // 构建Supabase Storage的上传URL
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
        const uploadUrl = `${supabaseUrl}/storage/v1/object/toll-images/${fileName}?apikey=${supabaseKey}`
        
        console.log('准备上传文件，URL:', uploadUrl)
        console.log('文件名:', fileName)
        
        // 使用Taro.uploadFile直接上传文件
        await new Promise((resolve, reject) => {
          Taro.uploadFile({
            url: uploadUrl,
            filePath: fileOrPath,
            name: 'file',
            method: 'POST',
            header: {
              'Content-Type': 'application/octet-stream',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            success: (res) => {
              console.log('图片上传成功:', res)
              resolve(res)
            },
            fail: (err) => {
              console.error('图片上传失败:', err)
              reject(err)
            }
          })
        })
        
        // 获取公开访问URL
        const { data: urlData } = supabase
          .storage
          .from('toll-images')
          .getPublicUrl(fileName)
        
        imageUrl = urlData.publicUrl
        console.log('图片URL:', imageUrl)
      } catch (uploadError) {
        console.error('微信小程序上传图片失败，使用本地路径作为备选方案:', uploadError)
        // 上传失败时，使用本地路径作为备选方案
        imageUrl = fileOrPath
      }
    } else {
      // Web环境：使用File对象
      const file = fileOrPath
      
      // 生成唯一的文件名
      const timestamp = new Date().getTime()
      fileName = `${timestamp}-${file.name}`
      fileFormat = file.type.split('/')[1] || 'jpg'
      fileSize = file.size

      // 上传文件到Supabase Storage
      const {data: uploadData, error: uploadError} = await supabase
        .storage
        .from('toll-images')
        .upload(fileName, file)

      if (uploadError) {
        console.error('上传图片失败:', uploadError)
        return null
      }

      // 获取公开访问URL
      const {data: urlData} = supabase
        .storage
        .from('toll-images')
        .getPublicUrl(fileName)
      
      imageUrl = urlData.publicUrl
    }

    // 创建图片记录
    const {data: imageRecord, error: recordError} = await supabase
      .from('toll_record_images')
      .insert({
        record_id: recordId,
        image_url: imageUrl,
        file_name: fileName,
        file_size: fileSize,
        file_format: fileFormat,
        uploader: uploader
      })
      .select()
      .single()

    if (recordError) {
      console.error('创建图片记录失败:', recordError)
      return null
    }

    return imageRecord as TollRecordImage
  } catch (error) {
    console.error('上传图片异常:', error)
    return null
  }
}

// 获取指定记录的所有图片
export async function getRecordImages(recordId: string): Promise<TollRecordImage[]> {
  try {
    const {data, error} = await supabase
      .from('toll_record_images')
      .select('*')
      .eq('record_id', recordId)
      .order('created_at', {ascending: true})

    if (error) {
      console.error('获取记录图片失败:', error)
      return []
    }

    return data as TollRecordImage[]
  } catch (error) {
    console.error('获取记录图片异常:', error)
    return []
  }
}

// 删除图片
export async function deleteRecordImage(imageId: string): Promise<boolean> {
  try {
    // 先获取图片信息，以便删除存储中的文件
    const {data: imageData, error: getError} = await supabase
      .from('toll_record_images')
      .select('file_name')
      .eq('id', imageId)
      .single()

    if (getError) {
      console.error('获取图片信息失败:', getError)
      return false
    }

    // 删除存储中的文件
    await supabase
      .storage
      .from('record_images')
      .remove([imageData.file_name])

    // 删除数据库记录
    const {error: deleteError} = await supabase
      .from('toll_record_images')
      .delete()
      .eq('id', imageId)

    if (deleteError) {
      console.error('删除图片记录失败:', deleteError)
      return false
    }

    return true
  } catch (error) {
    console.error('删除图片异常:', error)
    return false
  }
}
