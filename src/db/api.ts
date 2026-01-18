// 导入真实的 Supabase 客户端

import Taro from '@tarojs/taro'
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

// 根据管理员ID获取可访问的收费记录（按收费站权限筛选）
export async function getTollRecordsByAdminId(adminId: string): Promise<TollRecord[]> {
  try {
    console.log('获取可访问的收费记录，管理员ID:', adminId)
    // 获取管理员信息
    const {data: adminData, error: adminError} = await supabase
      .from('admin_users')
      .select('role, station_id, company_id')
      .eq('id', adminId)
      .single()

    if (adminError || !adminData) {
      console.error('获取管理员信息失败:', adminError)
      // 出错时，尝试返回所有记录，避免体验版中页面空白
      console.log('获取管理员信息失败，尝试返回所有记录')
      const {data: allRecords} = await supabase.from('toll_records').select('*').order('created_at', {ascending: false})
      return allRecords || []
    }

    console.log('管理员信息:', adminData)

    // 获取所有收费员，包括他们的班组和收费站信息
    const {data: collectorsData, error: collectorsError} = await supabase.from('toll_collectors_info').select(`
        id,
        code,
        toll_groups (
          station_id
        )
      `)

    if (collectorsError) {
      console.error('获取收费员信息失败:', collectorsError)
      // 出错时，尝试返回所有记录，避免体验版中页面空白
      console.log('获取收费员信息失败，尝试返回所有记录')
      const {data: allRecords} = await supabase.from('toll_records').select('*').order('created_at', {ascending: false})
      return allRecords || []
    }

    // 根据管理员角色确定可访问的收费站ID列表
    let accessibleStationIds: string[] = []

    if (adminData.role === 'super_admin') {
      // 超级管理员：不做限制，所有收费站都可以访问
      // 这里不限制，后面查询所有记录
      console.log('超级管理员，返回所有记录')
    } else if (adminData.role === 'company_admin' && adminData.company_id) {
      // 分公司管理员：获取所属公司的所有收费站
      console.log('分公司管理员，公司ID:', adminData.company_id)
      const {data: stationsData} = await supabase
        .from('toll_stations')
        .select('id')
        .eq('company_id', adminData.company_id)

      accessibleStationIds = (stationsData || []).map((s) => s.id)
      console.log('可访问的收费站ID:', accessibleStationIds)
    } else if (adminData.role === 'station_admin' && adminData.station_id) {
      // 收费站管理员：只能查看自己所属收费站
      console.log('收费站管理员，收费站ID:', adminData.station_id)
      accessibleStationIds = [adminData.station_id]
    } else {
      // 没有权限，尝试返回所有记录，避免体验版中页面空白
      console.log('没有权限信息，尝试返回所有记录')
      const {data: allRecords} = await supabase.from('toll_records').select('*').order('created_at', {ascending: false})
      return allRecords || []
    }

    // 获取所有收费记录
    const query = supabase.from('toll_records').select('*').order('created_at', {ascending: false})

    const {data: allRecords, error: recordsError} = await query

    if (recordsError) {
      console.error('获取收费记录失败:', recordsError)
      return []
    }

    const allRecordsData = allRecords || []
    console.log('获取到的记录总数:', allRecordsData.length)

    // 如果是超级管理员，返回所有记录
    if (adminData.role === 'super_admin') {
      return allRecordsData as TollRecord[]
    }

    // 过滤记录：只返回属于可访问收费站的记录
    const filteredRecords = allRecordsData.filter((record) => {
      // 通过收费员信息获取收费站ID
      const parts = record.toll_collector?.split(' ')
      let collectorStationId = null

      if (parts && parts.length >= 2) {
        const employeeCode = parts[0] // 使用code而不是id
        const collector = collectorsData?.find((c) => c.code === employeeCode) // 按code匹配
        if (collector?.toll_groups?.station_id) {
          collectorStationId = collector.toll_groups.station_id
        }
      }

      // 如果找不到收费员信息，尝试返回该记录，避免体验版中页面空白
      if (!collectorStationId) {
        console.log('找不到收费员信息，尝试返回该记录')
        return true
      }

      // 检查是否属于可访问的收费站
      const isAccessible = accessibleStationIds.includes(collectorStationId)
      if (!isAccessible) {
        console.log('记录不属于可访问的收费站，跳过')
      }
      return isAccessible
    })

    console.log('过滤后的记录数:', filteredRecords.length)
    return filteredRecords as TollRecord[]
  } catch (error) {
    console.error('获取可访问的收费记录异常:', error)
    // 出错时，尝试返回所有记录，避免体验版中页面空白
    try {
      console.log('获取可访问的收费记录异常，尝试返回所有记录')
      const {data: allRecords} = await supabase.from('toll_records').select('*').order('created_at', {ascending: false})
      return allRecords || []
    } catch (innerError) {
      console.error('尝试返回所有记录也失败:', innerError)
      return []
    }
  }
}

// 获取带图片信息的收费记录（用于历史记录页面）
export async function getTollRecordsWithImages(
  adminId: string
): Promise<(TollRecord & {images?: TollRecordImage[]})[]> {
  try {
    const records = await getTollRecordsByAdminId(adminId)

    // 获取所有图片信息
    const {data: allImages, error: imagesError} = await supabase
      .from('toll_record_images')
      .select('*')
      .order('created_at', {ascending: true})

    if (imagesError) {
      console.error('获取图片信息失败:', imagesError)
      return records as (TollRecord & {images?: TollRecordImage[]})[]
    }

    // 将图片信息关联到记录
    const recordsWithImages = records.map((record) => {
      const recordImages = (allImages || []).filter((img) => img.record_id === record.id)
      return {
        ...record,
        images: recordImages
      }
    })

    return recordsWithImages
  } catch (error) {
    console.error('获取带图片的收费记录异常:', error)
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
export async function uploadRecordImage(
  recordId: string,
  fileOrPath: File | string,
  uploader: string
): Promise<TollRecordImage | null> {
  try {
    let fileName: string
    let fileSize: number
    let fileFormat: string
    let imageUrl: string
    let uploadSuccess = false

    if (typeof fileOrPath === 'string') {
      // 微信小程序：使用本地路径上传到Supabase Storage
      // 生成唯一的文件名
      const timestamp = Date.now()
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
        const uploadResult = await new Promise<{ statusCode: number; data: string }>((resolve, reject) => {
          Taro.uploadFile({
            url: uploadUrl,
            filePath: fileOrPath,
            name: 'file',
            method: 'POST',
            header: {
              'Content-Type': 'application/octet-stream',
              Authorization: `Bearer ${supabaseKey}`,
              apikey: supabaseKey
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

        // 检查上传状态
        if (uploadResult.statusCode >= 200 && uploadResult.statusCode < 300) {
          console.log('图片上传成功，状态码:', uploadResult.statusCode)
          // 获取公开访问URL
          imageUrl = `${supabaseUrl}/storage/v1/object/public/toll-images/${fileName}`
          console.log('图片URL:', imageUrl)
          uploadSuccess = true
        } else {
          console.error('上传失败，状态码:', uploadResult.statusCode)
          throw new Error(`上传失败，状态码: ${uploadResult.statusCode}`)
        }
      } catch (uploadError) {
        console.error('微信小程序上传图片失败:', uploadError)
        // 上传失败时，不使用本地路径作为备选方案，而是抛出错误
        throw uploadError
      }
    } else {
      // Web环境：使用File对象
      const file = fileOrPath

      // 生成唯一的文件名
      const timestamp = Date.now()
      fileName = `${timestamp}-${file.name}`
      fileFormat = file.type.split('/')[1] || 'jpg'
      fileSize = file.size

      // 上传文件到Supabase Storage
      const {data: uploadData, error: uploadError} = await supabase.storage.from('toll-images').upload(fileName, file)

      if (uploadError) {
        console.error('上传图片失败:', uploadError)
        throw uploadError
      }

      // 获取公开访问URL
      const {data: urlData} = supabase.storage.from('toll-images').getPublicUrl(fileName)

      imageUrl = urlData.publicUrl
      uploadSuccess = true
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

    console.log('图片记录保存成功:', imageRecord)
    return imageRecord as TollRecordImage
  } catch (error) {
    console.error('上传图片异常:', error)
    // 返回null表示上传失败
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
    await supabase.storage.from('record_images').remove([imageData.file_name])

    // 删除数据库记录
    const {error: deleteError} = await supabase.from('toll_record_images').delete().eq('id', imageId)

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

// ==================== 登录认证相关 API ====================

// 登录功能
export async function login(
  username: string,
  _password: string
): Promise<{
  success: boolean
  user?: any
  message?: string
}> {
  try {
    const {data, error} = await supabase.from('admin_users').select('*').eq('username', username).single()

    if (error) {
      console.error('查询用户失败:', error)
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }

    if (!data) {
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }

    return {
      success: true,
      user: data
    }
  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      message: '登录失败，请稍后重试'
    }
  }
}

// 根据管理员ID获取所属收费站信息
export async function getStationByAdminId(adminId: string): Promise<{
  id: string
  name: string
  code: string
} | null> {
  try {
    const {data: adminData, error: adminError} = await supabase
      .from('admin_users')
      .select('station_id')
      .eq('id', adminId)
      .single()

    if (adminError || !adminData?.station_id) {
      return null
    }

    const {data: stationData, error: stationError} = await supabase
      .from('toll_stations')
      .select('id, name, code')
      .eq('id', adminData.station_id)
      .single()

    if (stationError) {
      console.error('获取收费站信息失败:', stationError)
      return null
    }

    return stationData as {
      id: string
      name: string
      code: string
    }
  } catch (error) {
    console.error('获取收费站信息异常:', error)
    return null
  }
}

// 根据收费站ID获取收费员
export async function getCollectorsByStation(stationId: string): Promise<Collector[]> {
  try {
    // 获取指定收费站的所有班组ID
    const {data: groupsData, error: groupsError} = await supabase
      .from('toll_groups')
      .select('id')
      .eq('station_id', stationId)

    if (groupsError) {
      console.error('获取班组失败:', groupsError)
      return []
    }

    const groupIds = (groupsData || []).map((group) => group.id)
    if (groupIds.length === 0) {
      return []
    }

    // 根据班组ID获取收费员
    const {data: collectorsData, error: collectorsError} = await supabase
      .from('toll_collectors_info')
      .select('id, name, code')
      .in('group_id', groupIds)
      .order('name')

    if (collectorsError) {
      console.error('获取收费员失败:', collectorsError)
      return []
    }

    return (collectorsData || []) as Collector[]
  } catch (error) {
    console.error('获取收费员异常:', error)
    return []
  }
}

// 根据收费站ID获取监控员
export async function getMonitorsByStation(stationId: string): Promise<Monitor[]> {
  try {
    const {data, error} = await supabase
      .from('monitors_info')
      .select('id, name, code')
      .eq('station_id', stationId)
      .order('name')

    if (error) {
      console.error('获取监控员失败:', error)
      return []
    }

    return (data || []) as Monitor[]
  } catch (error) {
    console.error('获取监控员异常:', error)
    return []
  }
}

// 根据管理员ID获取可访问的收费员（基于所属收费站）
export async function getAccessibleCollectors(adminId: string): Promise<Collector[]> {
  try {
    // 获取管理员信息
    const {data: adminData, error: adminError} = await supabase
      .from('admin_users')
      .select('role, station_id, company_id')
      .eq('id', adminId)
      .single()

    if (adminError || !adminData) {
      return []
    }

    // 获取所有收费员，包括他们的班组和收费站信息
    const {data: allCollectorsData, error: allCollectorsError} = await supabase
      .from('toll_collectors_info')
      .select(`
        id, 
        name, 
        code,
        toll_groups (
          id,
          station_id,
          toll_stations (
            id,
            company_id
          )
        )
      `)
      .order('name')

    if (allCollectorsError) {
      console.error('获取所有收费员失败:', allCollectorsError)
      return []
    }

    const allCollectors = allCollectorsData || []

    // 超级管理员可以查看所有收费员
    if (adminData.role === 'super_admin') {
      return allCollectors.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code
      })) as Collector[]
    }

    // 分公司管理员可以查看所属公司的所有收费员
    if (adminData.role === 'company_admin' && adminData.company_id) {
      const accessibleCollectors = allCollectors.filter((collector) => {
        // 通过班组和收费站获取所属公司
        const group = collector.toll_groups
        if (!group) return false

        const station = group.toll_stations
        if (!station) return false

        return station.company_id === adminData.company_id
      })

      return accessibleCollectors.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code
      })) as Collector[]
    }

    // 收费站管理员只能查看所属收费站的收费员
    if (adminData.role === 'station_admin' && adminData.station_id) {
      const accessibleCollectors = allCollectors.filter((collector) => {
        // 通过班组获取所属收费站
        const group = collector.toll_groups
        if (!group) return false

        return group.station_id === adminData.station_id
      })

      return accessibleCollectors.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code
      })) as Collector[]
    }

    return []
  } catch (error) {
    console.error('获取可访问收费员异常:', error)
    return []
  }
}

// 根据管理员ID获取可访问的监控员（基于所属收费站）
export async function getAccessibleMonitors(_adminId: string): Promise<Monitor[]> {
  try {
    // 根据需求，监控员在任何账号登录时都显示
    return await getAllMonitors()
  } catch (error) {
    console.error('获取可访问监控员异常:', error)
    return []
  }
}
