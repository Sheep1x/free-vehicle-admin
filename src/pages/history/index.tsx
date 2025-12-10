import {Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {deleteTollRecords, getAllTollRecords, getTollRecordsByPlateNumber} from '@/db/api'
import type {TollRecord} from '@/db/types'

const History: React.FC = () => {
  const [records, setRecords] = useState<TollRecord[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isEditMode, setIsEditMode] = useState(false)

  // 加载记录
  const loadRecords = useCallback(async () => {
    try {
      let data: TollRecord[]
      if (searchText.trim()) {
        data = await getTollRecordsByPlateNumber(searchText.trim())
      } else {
        data = await getAllTollRecords()
      }
      setRecords(data)
    } catch (error) {
      console.error('加载记录失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
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
      Taro.hideLoading()

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
  const handleViewDetail = (record: TollRecord) => {
    if (isEditMode) {
      toggleSelect(record.id)
      return
    }

    // 跳转到结果页面查看详情
    Taro.navigateTo({
      url: `/pages/result/index?data=${encodeURIComponent(
        JSON.stringify({
          imageUrl: record.image_url,
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
      const date = new Date(timeStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    } catch {
      return timeStr
    }
  }

  return (
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
          <View className="px-4 py-4">
            {records.length === 0 ? (
              <View className="flex flex-col items-center justify-center py-20">
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

                      {/* 图片 */}
                      {record.image_url && !isEditMode && (
                        <View className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <Image src={record.image_url} mode="aspectFill" className="w-full h-full" />
                        </View>
                      )}

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
                              <Text className="text-sm text-muted-foreground line-clamp-1">{record.entry_info}</Text>
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

                          <View className="flex items-center">
                            <View className="i-mdi-clock-outline text-sm text-muted-foreground mr-1" />
                            <Text className="text-sm text-muted-foreground">
                              {formatTime(record.entry_time || record.created_at)}
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
  )
}

export default History
