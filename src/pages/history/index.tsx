import {Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import AuthGuard from '@/components/AuthGuard'
import {
  deleteTollRecords,
  getTollRecordsByAdminId,
  getTollRecordsByPlateNumber,
  getTollRecordsWithImages
} from '@/db/api'
import type {TollRecord, TollRecordImage} from '@/db/types'
import {getCurrentUser} from '@/store/auth'
import {loadImageWithCache} from '@/utils/imageCache'

interface TollRecordWithImages extends TollRecord {
  images?: TollRecordImage[]
}

const History: React.FC = () => {
  const [records, setRecords] = useState<TollRecordWithImages[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isEditMode, setIsEditMode] = useState(false)

  // 加载记录
  const loadRecords = useCallback(async () => {
    try {
      console.log('开始加载记录...')
      const currentUser = getCurrentUser()

      console.log('当前用户:', currentUser)
      if (!currentUser) {
        console.log('未登录，跳转到登录页')
        Taro.showToast({
          title: '请先登录',
          icon: 'none'
        })
        Taro.reLaunch({
          url: '/pages/login/index'
        })
        return
      }

      let data: TollRecordWithImages[]
      if (searchText.trim()) {
        console.log('搜索模式，关键词:', searchText)
        // 搜索时也需要按权限筛选
        const allSearchResults = await getTollRecordsByPlateNumber(searchText.trim())
        console.log('搜索结果:', allSearchResults.length, '条')
        
        // 获取可访问的记录
        const accessibleRecords = await getTollRecordsByAdminId(currentUser.id)
        console.log('可访问记录:', accessibleRecords.length, '条')
        
        // 获取所有图片信息
        const {data: allImages} = await supabase.from('toll_record_images').select('*')
        console.log('图片信息:', (allImages || []).length, '条')

        // 取交集，只保留既匹配搜索条件又有访问权限的记录
        const accessibleIds = new Set(accessibleRecords.map((r) => r.id))
        const filteredRecords = allSearchResults.filter((r) => accessibleIds.has(r.id))
        console.log('过滤后记录:', filteredRecords.length, '条')

        // 关联图片信息
        data = filteredRecords.map((record) => ({
          ...record,
          images: (allImages || []).filter((img) => img.record_id === record.id)
        }))
      } else {
        console.log('正常模式，获取所有记录')
        data = await getTollRecordsWithImages(currentUser.id)
        console.log('获取记录:', data.length, '条')
      }
      
      setRecords(data)
      console.log('记录设置完成')

      // 预加载图片到缓存（异步，不阻塞UI）
      data.forEach((record) => {
        const displayImageUrl = record.images && record.images.length > 0 ? record.images[0].image_url : record.image_url
        if (displayImageUrl && !displayImageUrl.startsWith('wxfile://')) {
          loadImageWithCache(displayImageUrl).catch(() => {})
        }
      })
    } catch (error) {
      console.error('加载记录失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
      // 即使出错，也确保records不为undefined
      setRecords([])
    }
  }, [searchText])

  // 页面显示时加载数据
  useDidShow(() => {
    loadRecords()
  })

  // 搜索
  const handleSearch = () => {
    loadRecords()
  }

  // 切换选中状态
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(records.map((r) => r.id))
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      Taro.showToast({
        title: '请选择要删除的记录',
        icon: 'none'
      })
      return
    }

    const result = await Taro.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedIds.length} 条记录吗？`
    })

    if (result.confirm) {
      Taro.showLoading({title: '删除中...'})
      const success = await deleteTollRecords(selectedIds)
      Taro.hideLoading({fail: () => {}}) // 添加fail回调，忽略隐藏失败的错误

      if (success) {
        Taro.showToast({
          title: '删除成功',
          icon: 'success'
        })
        setSelectedIds([])
        setIsEditMode(false)
        loadRecords()
      } else {
        Taro.showToast({
          title: '删除失败',
          icon: 'none'
        })
      }
    }
  }

  // 查看记录详情
  const handleViewDetail = (record: TollRecordWithImages) => {
    if (isEditMode) {
      toggleSelect(record.id)
      return
    }

    // 优先使用toll_record_images表中的图片
    const displayImageUrl = record.images && record.images.length > 0 ? record.images[0].image_url : record.image_url

    // 预加载图片到缓存（异步，不阻塞跳转）
    if (displayImageUrl) {
      loadImageWithCache(displayImageUrl).catch(() => {})
    }

    // 跳转到结果页面查看详情
    Taro.navigateTo({
      url: `/pages/result/index?data=${encodeURIComponent(
        JSON.stringify({
          recordId: record.id,
          imageUrl: displayImageUrl,
          plateNumber: record.plate_number,
          vehicleType: record.vehicle_type,
          axleCount: record.axle_count,
          tonnage: record.tonnage,
          entryInfo: record.entry_info,
          entryTime: record.entry_time,
          amount: record.amount,
          freeReason: record.free_reason,
          tollCollector: record.toll_collector,
          monitor: record.monitor
        })
      )}`
    })
  }

  // 格式化时间
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
    try {
      // 检查是否是已经格式化好的本地时间字符串（包含空格分隔符）
      if (timeStr.includes(' ')) {
        // 已经是YYYY-MM-DD HH:MM:SS格式，只保留到分钟
        const parts = timeStr.split(':')
        if (parts.length >= 2) {
          // 提取日期部分和小时分钟部分
          const datePart = timeStr.split(' ')[0]
          const timePart = `${parts[0]}:${parts[1]}`
          return `${datePart} ${timePart}`
        }
        return timeStr
      }

      // 处理不同格式的时间字符串
      let date: Date
      // 确保timeStr是字符串类型
      let timeStrToUse: string
      if (typeof timeStr === 'string') {
        timeStrToUse = timeStr
      } else {
        // 对于非字符串类型，尝试转换为字符串
        timeStrToUse = String(timeStr)
      }

      // 处理ISO格式时间字符串，去掉时区信息
      if (timeStrToUse.includes('+00:00')) {
        timeStrToUse = timeStrToUse.replace('+00:00', '')
      }
      // 处理T分隔符
      if (timeStrToUse.includes('T')) {
        timeStrToUse = timeStrToUse.replace('T', ' ')
      }
      // 只保留到分钟
      if (timeStrToUse.includes(':')) {
        const parts = timeStrToUse.split(':')
        timeStrToUse = `${parts[0]}:${parts[1]}`
      }

      date = new Date(timeStrToUse)

      // 确保时间有效
      if (Number.isNaN(date.getTime())) {
        return timeStr
      }
      // 返回格式化时间：YYYY-MM-DD HH:MM
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    } catch (error) {
      console.error('格式化时间失败:', error)
      return timeStr
    }
  }

  // 处理入口信息，移除括号及其中内容
  const processEntryInfo = (entryInfo: string | null) => {
    if (!entryInfo) return ''
    // 移除括号及其中的内容
    return entryInfo.replace(/\([^)]*\)/g, '').trim()
  }

  return (
    <AuthGuard>
      <View className="min-h-screen bg-gradient-bg">
        {/* 搜索栏 */}
        <View className="bg-card px-4 py-3 shadow-card">
          <View className="flex items-center gap-2">
            <View className="flex-1 bg-input rounded-lg px-3 py-2 flex items-center">
              <View className="i-mdi-magnify text-xl text-muted-foreground mr-2" />
              <Input
                className="flex-1 text-foreground"
                value={searchText}
                onInput={(e) => setSearchText(e.detail.value)}
                onConfirm={handleSearch}
                placeholder="搜索车牌号"
              />
            </View>
            <View className="bg-primary rounded-lg px-4 py-2 flex items-center justify-center" onClick={handleSearch}>
              <Text className="text-primary-foreground text-sm">搜索</Text>
            </View>
          </View>
        </View>
        {/* 工具栏 */}
        <View className="bg-card px-4 py-3 flex items-center justify-between border-b border-border">
          <Text className="text-sm text-muted-foreground">
            共 {records.length} 条记录
            {isEditMode && selectedIds.length > 0 && ` (已选 ${selectedIds.length} 条)`}
          </Text>
          <View className="flex items-center gap-3">
            {isEditMode && (
              <>
                <View onClick={toggleSelectAll}>
                  <Text className="text-sm text-primary">
                    {selectedIds.length === records.length ? '取消全选' : '全选'}
                  </Text>
                </View>
                <View onClick={handleBatchDelete}>
                  <Text className="text-sm text-destructive">删除</Text>
                </View>
              </>
            )}
            <View
              onClick={() => {
                setIsEditMode(!isEditMode)
                setSelectedIds([])
              }}>
              <Text className="text-sm text-primary">{isEditMode ? '完成' : '管理'}</Text>
            </View>
          </View>
        </View>
        {/* 记录列表 */}
        <View className="bg-gradient-bg">
          <ScrollView scrollY style={{background: 'transparent'}} className="h-screen">
            <View className="px-4 py-4 border-[0px] border-solid border-[#29313fff]">
              {records.length === 0 ? (
                <View className="px-4 py-4 border-solid border-[#085df0ff] border-[0px] border-[#1492ff]">
                  <View className="i-mdi-file-document-outline text-6xl text-muted-foreground mb-4" />
                  <Text className="text-muted-foreground">暂无记录</Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {records.map((record) => (
                    <View
                      key={record.id}
                      className="bg-card rounded-xl p-4 shadow-card"
                      onClick={() => handleViewDetail(record)}>
                      <View className="flex items-start gap-3">
                        {/* 选择框 */}
                        {isEditMode && (
                          <View className="pt-1">
                            <View
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedIds.includes(record.id) ? 'bg-primary border-primary' : 'border-border'
                              }`}>
                              {selectedIds.includes(record.id) && (
                                <View className="i-mdi-check text-sm text-primary-foreground" />
                              )}
                            </View>
                          </View>
                        )}

                        {/* 图片 - 使用toll_record_images表中的图片 */}
                        {!isEditMode &&
                          (record.images && record.images.length > 0 ? (
                            <View className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src={record.images[0].image_url}
                                mode="aspectFill"
                                className="w-full h-full"
                              />
                            </View>
                          ) : record.image_url ? (
                            <View className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src={record.image_url}
                                mode="aspectFill"
                                className="w-full h-full"
                              />
                            </View>
                          ) : null)}

                        {/* 记录信息 */}
                        <View className="flex-1">
                          <View className="flex items-center justify-between mb-2">
                            <Text className="text-lg font-bold text-foreground">{record.plate_number || '未识别'}</Text>
                            {record.free_reason && (
                              <View className="bg-primary/10 px-2 py-1 rounded">
                                <Text className="text-xs text-primary">{record.free_reason}</Text>
                              </View>
                            )}
                          </View>

                          <View className="space-y-1">
                            {record.vehicle_type && (
                              <View className="flex items-center">
                                <View className="i-mdi-car text-sm text-muted-foreground mr-1" />
                                <Text className="text-sm text-muted-foreground">
                                  {record.vehicle_type}
                                  {record.axle_count && ` · ${record.axle_count}`}
                                  {record.tonnage && ` · ${record.tonnage}`}
                                </Text>
                              </View>
                            )}

                            {record.entry_info && (
                              <View className="flex items-center">
                                <View className="i-mdi-map-marker text-sm text-muted-foreground mr-1" />
                                <Text className="text-sm text-muted-foreground line-clamp-1">
                                  {processEntryInfo(record.entry_info)}
                                </Text>
                              </View>
                            )}

                            {(record.toll_collector || record.monitor) && (
                              <View className="flex items-center">
                                <View className="i-mdi-account text-sm text-muted-foreground mr-1" />
                                <Text className="text-sm text-muted-foreground">
                                  {record.toll_collector && `收费员: ${record.toll_collector}`}
                                  {record.toll_collector && record.monitor && ' · '}
                                  {record.monitor && `监控员: ${record.monitor}`}
                                </Text>
                              </View>
                            )}

                            {/* 登记时间 */}
                            <View className="flex items-center">
                              <View className="i-mdi-clock-outline text-sm text-muted-foreground mr-1" />
                              <Text className="text-sm text-muted-foreground">
                                登记时间: {formatTime(record.entry_time || record.created_at)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={{height: '100px'}} />
          </ScrollView>
        </View>
      </View>
    </AuthGuard>
  )
}

export default History
