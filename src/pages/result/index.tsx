import {Button, Image, Input, Picker, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import type React from 'react'
import {useCallback, useEffect, useRef, useState} from 'react'
import {createTollRecord, getAllCollectors, getAllMonitors, getCurrentShift, getShiftSettings} from '@/db/api'
import {compressImage, imageToBase64} from '@/utils/imageUtils'
import type {OCRResult} from '@/utils/ocrUtils'
import {recognizeTollReceipt} from '@/utils/ocrUtils'
import {uploadImage} from '@/utils/uploadUtils'

// 免费原因选项
const FREE_REASONS = ['应急车', '军警车', '旅游包车', '紧急车']

// 防抖函数
const _debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout | null = null
  return (...args: any[]) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

const Result: React.FC = () => {
  const router = useRouter()
  const [imageUrl, setImageUrl] = useState('')
  const [localImageUrl, setLocalImageUrl] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [axleCount, setAxleCount] = useState('')
  const [tonnage, setTonnage] = useState('')
  const [entryInfo, setEntryInfo] = useState('')
  const [entryTime, setEntryTime] = useState(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  })
  const [amount, setAmount] = useState('')
  const [freeReason, setFreeReason] = useState('')
  const [tollCollector, setTollCollector] = useState('')
  const [monitor, setMonitor] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)

  // 免费原因选择器索引
  const [freeReasonIndex, setFreeReasonIndex] = useState(0)

  // 收费员和监控员列表
  const [collectorsList, setCollectorsList] = useState<Array<{id: string; name: string; code: string}>>([])
  const [monitorsList, setMonitorsList] = useState<Array<{id: string; name: string; code: string}>>([])
  const [_collectorIndex, _setCollectorIndex] = useState(0)
  const [_monitorIndex, _setMonitorIndex] = useState(0)
  // 搜索功能相关状态
  const [collectorSearch, setCollectorSearch] = useState('')
  const [monitorSearch, setMonitorSearch] = useState('')
  const [showCollectorOptions, setShowCollectorOptions] = useState(false)
  const [showMonitorOptions, setShowMonitorOptions] = useState(false)
  // 过滤后的列表
  const [filteredCollectors, setFilteredCollectors] = useState<Array<{id: string; name: string; code: string}>>([])
  const [filteredMonitors, setFilteredMonitors] = useState<Array<{id: string; name: string; code: string}>>([])
  // 下拉选项容器ref
  const collectorOptionsRef = useRef<HTMLDivElement>(null)
  const monitorOptionsRef = useRef<HTMLDivElement>(null)

  // 当前班次
  const [currentShift, setCurrentShift] = useState('')

  // 加载收费员和监控员列表
  const loadStaffData = useCallback(async () => {
    try {
      const [collectors, monitors, shifts] = await Promise.all([
        getAllCollectors(),
        getAllMonitors(),
        getShiftSettings()
      ])

      setCollectorsList(collectors)
      setMonitorsList(monitors)

      // 计算当前班次
      if (shifts.length > 0) {
        const shift = getCurrentShift(shifts)
        setCurrentShift(shift)
      }
    } catch (error) {
      console.error('加载人员数据失败:', error)
    }
  }, [])

  useEffect(() => {
    loadStaffData()
  }, [loadStaffData])

  // 处理入口信息，移除括号及其中内容
  const processEntryInfo = useCallback((entryInfo: string) => {
    if (!entryInfo) return ''
    // 移除括号及其中的内容
    return entryInfo.replace(/\([^)]*\)/g, '').trim()
  }, [])

  // 格式化时间，移除ISO格式的T和时区信息
  const formatEntryTime = useCallback((time: string) => {
    if (!time) return ''
    // 处理ISO格式时间字符串，去掉时区信息
    if (time.includes('+00:00')) {
      time = time.replace('+00:00', '')
    }
    // 处理T分隔符
    if (time.includes('T')) {
      time = time.replace('T', ' ')
    }
    return time
  }, [])

  useEffect(() => {
    // 从路由参数获取识别结果
    const {data} = router.params
    if (data) {
      try {
        const result = JSON.parse(decodeURIComponent(data))
        setLocalImageUrl(result.imageUrl || '') // 保存本地路径用于重新识别
        if (result.imageUrl) {
          Taro.showLoading({title: '上传图片中...'})
          uploadImage(result.imageUrl)
            .then((publicUrl) => {
              setImageUrl(publicUrl) // 使用云存储URL
              Taro.hideLoading({fail: () => {}}) // 添加fail回调，忽略隐藏失败的错误
            })
            .catch(() => {
              Taro.hideLoading({fail: () => {}}) // 添加fail回调，忽略隐藏失败的错误
              Taro.showToast({title: '图片上传失败', icon: 'none'})
              // 即使上传失败，也显示本地图片
              setImageUrl(result.imageUrl || '')
            })
        }
        setPlateNumber(result.plateNumber || '')
        setVehicleType(result.vehicleType || '')
        setAxleCount(result.axleCount || '')
        setTonnage(result.tonnage || '')
        setEntryInfo(processEntryInfo(result.entryInfo || ''))
        // setEntryTime 不再从OCR结果中获取，而是在页面加载时默认设置为当前时间
        setAmount(result.amount?.toString() || '')
        setFreeReason(result.freeReason || '')
        // 设置收费员信息，确保收费员搜索框和显示值一致
        const collectorValue = result.tollCollector || ''
        setTollCollector(collectorValue)
        setCollectorSearch(collectorValue)
        // 设置监控员信息，确保监控员搜索框和显示值一致
        const monitorValue = result.monitor || ''
        setMonitor(monitorValue)
        setMonitorSearch(monitorValue)
      } catch (error) {
        console.error('解析识别结果失败:', error)
      }
    }
  }, [router.params, processEntryInfo])

  // 重新识别
  const handleReRecognize = async () => {
    if (!imageUrl) {
      Taro.showToast({
        title: '没有图片可识别',
        icon: 'none'
      })
      return
    }

    setIsRecognizing(true)
    Taro.showLoading({
      title: '识别中...'
    })

    try {
      // 1. 压缩图片
      const compressedPath = await compressImage(localImageUrl, 0.8)

      // 2. 转换为Base64
      const base64Image = await imageToBase64(compressedPath)

      // 3. 调用OCR识别
      const result: OCRResult = await recognizeTollReceipt(base64Image)

      Taro.hideLoading({fail: () => {}}) // 添加fail回调，忽略隐藏失败的错误

      // 4. 更新表单数据
      setPlateNumber(result.plateNumber || '')
      setVehicleType(result.vehicleType || '')
      setAxleCount(result.axleCount || '')
      setTonnage(result.tonnage || '')
      setEntryInfo(processEntryInfo(result.entryInfo || ''))
      // 只有当result.entryTime有值时才更新entryTime，否则保留现有的时间
      if (result.entryTime) {
        setEntryTime(formatEntryTime(result.entryTime))
      }
      setAmount(result.amount?.toString() || '')

      Taro.showToast({
        title: '识别完成',
        icon: 'success'
      })
    } catch (error) {
      console.error('识别失败:', error)
      Taro.hideLoading({fail: () => {}}) // 添加fail回调，忽略隐藏失败的错误
      Taro.showToast({
        title: '识别失败，请重试',
        icon: 'none'
      })
    } finally {
      setIsRecognizing(false)
    }
  }

  // 保存记录
  const handleSave = async () => {
    if (!plateNumber) {
      Taro.showToast({
        title: '请填写车牌号',
        icon: 'none'
      })
      return
    }

    if (!freeReason) {
      Taro.showToast({
        title: '请选择免费原因',
        icon: 'none'
      })
      return
    }

    setIsSaving(true)
    Taro.showLoading({
      title: '保存中...'
    })

    // 直接使用 state 中的 entryTime 作为登记时间
    const currentTime = entryTime

    try {
      const record = await createTollRecord({
        plate_number: plateNumber,
        vehicle_type: vehicleType,
        axle_count: axleCount,
        tonnage: tonnage,
        entry_info: entryInfo,
        entry_time: currentTime, // 使用当前时间作为登记时间
        amount: amount ? Number.parseFloat(amount) : undefined,
        image_url: imageUrl,
        free_reason: freeReason,
        toll_collector: tollCollector,
        monitor: monitor
      })

      Taro.hideLoading({fail: () => {}}) // 添加fail回调，忽略隐藏失败的错误

      if (record) {
        Taro.showToast({
          title: '保存成功',
          icon: 'success'
        })

        // 延迟跳转到历史记录页面
        setTimeout(() => {
          Taro.switchTab({
            url: '/pages/history/index'
          })
        }, 1500)
      } else {
        Taro.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('保存记录失败:', error)
      Taro.hideLoading({fail: () => {}}) // 添加fail回调，忽略隐藏失败的错误
      Taro.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 返回上一页
  const handleBack = () => {
    Taro.navigateBack()
  }

  // 免费原因选择
  const handleFreeReasonChange = (e) => {
    const index = e.detail.value
    setFreeReasonIndex(index)
    setFreeReason(FREE_REASONS[index])
  }

  // 过滤收费员列表（带防抖）
  useEffect(() => {
    const filterCollectors = () => {
      if (collectorSearch.trim() === '') {
        setFilteredCollectors(collectorsList)
      } else {
        const searchTerm = collectorSearch.toLowerCase()
        setFilteredCollectors(
          collectorsList.filter(
            (item) => item.name.toLowerCase().includes(searchTerm) || item.code.toLowerCase().includes(searchTerm)
          )
        )
      }
    }

    // 防抖处理，延迟300ms执行过滤
    const timer = setTimeout(filterCollectors, 300)
    return () => clearTimeout(timer)
  }, [collectorSearch, collectorsList])

  // 过滤监控员列表（带防抖）
  useEffect(() => {
    const filterMonitors = () => {
      if (monitorSearch.trim() === '') {
        setFilteredMonitors(monitorsList)
      } else {
        const searchTerm = monitorSearch.toLowerCase()
        setFilteredMonitors(
          monitorsList.filter(
            (item) => item.name.toLowerCase().includes(searchTerm) || item.code.toLowerCase().includes(searchTerm)
          )
        )
      }
    }

    // 防抖处理，延迟300ms执行过滤
    const timer = setTimeout(filterMonitors, 300)
    return () => clearTimeout(timer)
  }, [monitorSearch, monitorsList])

  // 收费员选择
  const handleCollectorSelect = (collector) => {
    const fullName = `${collector.code} ${collector.name}`
    setTollCollector(fullName)
    setCollectorSearch(fullName)
    setShowCollectorOptions(false)
  }

  // 监控员选择
  const handleMonitorSelect = (monitor) => {
    const fullName = `${monitor.code} ${monitor.name}`
    setMonitor(fullName)
    setMonitorSearch(fullName)
    setShowMonitorOptions(false)
  }

  // 点击外部关闭下拉选项
  useEffect(() => {
    const handleClickOutside = (e) => {
      const collectorOptionsEl = collectorOptionsRef.current
      const monitorOptionsEl = monitorOptionsRef.current

      // 检查点击是否发生在下拉选项外部
      const isClickOutsideCollector = collectorOptionsEl && !collectorOptionsEl.contains(e.target)
      const isClickOutsideMonitor = monitorOptionsEl && !monitorOptionsEl.contains(e.target)

      // 检查点击是否发生在输入框外部
      const isClickOutsideInput = e.target.tagName !== 'INPUT' && !e.target.closest('.bg-input')

      if (isClickOutsideCollector && isClickOutsideMonitor && isClickOutsideInput) {
        setShowCollectorOptions(false)
        setShowMonitorOptions(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  return (
    <View className="min-h-screen bg-gradient-bg pb-6">
      {/* 自定义返回按钮 */}
      <View className="fixed top-10 left-0 z-50 px-4 py-3" onClick={handleBack}>
        <View className="flex items-center bg-primary rounded-full w-10 h-10 justify-center shadow-lg">
          <View className="i-mdi-chevron-left text-3xl text-primary-foreground" />
        </View>
      </View>
      <View className="px-4 pt-16">
        {/* 图片 */}
        {imageUrl && (
          <View className="bg-card rounded-xl p-4 mb-6 shadow-card">
            <Image src={imageUrl} mode="aspectFit" className="w-full rounded-lg" style={{height: '200px'}} />
          </View>
        )}

        {/* 识别结果 */}
        <View className="bg-card rounded-xl p-4 mb-6 shadow-card">
          <View className="flex items-center mb-4">
            <View className="i-mdi-file-document-outline text-2xl text-primary mr-2" />
            <Text className="text-lg font-bold text-foreground">识别结果</Text>
          </View>

          <View className="space-y-4">
            {/* 车牌号 */}
            <View>
              <Text className="text-sm text-muted-foreground mb-2 block">车牌号（含颜色）</Text>
              <View className="bg-input rounded-lg px-3 py-2">
                <Input
                  className="w-full text-foreground"
                  value={plateNumber}
                  onInput={(e) => setPlateNumber(e.detail.value)}
                  placeholder="如：蓝 鲁P233CV"
                />
              </View>
            </View>

            {/* 车型 */}
            <View>
              <Text className="text-sm text-muted-foreground mb-2 block">车型</Text>
              <View className="bg-input rounded-lg px-3 py-2">
                <Input
                  className="w-full text-foreground"
                  value={vehicleType}
                  onInput={(e) => setVehicleType(e.detail.value)}
                  placeholder="请输入车型"
                />
              </View>
            </View>

            {/* 轴数和吨位 */}
            <View className="flex gap-3">
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-2 block">轴数</Text>
                <View className="bg-input rounded-lg px-3 py-2">
                  <Input
                    className="w-full text-foreground"
                    value={axleCount}
                    onInput={(e) => setAxleCount(e.detail.value)}
                    placeholder="如：2轴"
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-2 block">吨位</Text>
                <View className="bg-input rounded-lg px-3 py-2">
                  <Input
                    className="w-full text-foreground"
                    value={tonnage}
                    onInput={(e) => setTonnage(e.detail.value)}
                    placeholder="如：1.26吨"
                  />
                </View>
              </View>
            </View>

            {/* 入口信息 */}
            <View>
              <Text className="text-sm text-muted-foreground mb-2 block">入口信息</Text>
              <View className="bg-input rounded-lg px-3 py-2">
                <Input
                  className="w-full text-foreground"
                  value={entryInfo}
                  onInput={(e) => setEntryInfo(e.detail.value)}
                  placeholder="请输入入口信息"
                />
              </View>
            </View>

            {/* 登记时间 */}
            <View>
              <Text className="text-sm text-muted-foreground mb-2 block">登记时间</Text>
              <View className="bg-input rounded-lg px-3 py-2">
                <Input
                  className="w-full text-foreground"
                  value={entryTime}
                  onInput={(e) => setEntryTime(e.detail.value)}
                  placeholder="如：2025-12-06 13:25:05"
                />
              </View>
            </View>

            {/* 金额 */}
            <View>
              <Text className="text-sm text-muted-foreground mb-2 block">金额（元）</Text>
              <View className="bg-input rounded-lg px-3 py-2">
                <Input
                  className="w-full text-foreground"
                  type="digit"
                  value={amount}
                  onInput={(e) => setAmount(e.detail.value)}
                  placeholder="请输入金额"
                />
              </View>
            </View>

            {/* 收费员和监控员（并排） */}
            <View className="flex gap-3">
              {/* 收费员 */}
              <View className="flex-1 relative">
                <Text className="text-sm text-muted-foreground mb-2 block">收费员</Text>
                <View className="relative">
                  <View
                    className={`bg-input rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer border ${showCollectorOptions ? 'border-primary' : 'border-transparent'} transition-all duration-200`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowCollectorOptions(!showCollectorOptions)
                      setShowMonitorOptions(false)
                    }}>
                    <Input
                      className="w-full text-foreground text-sm focus:outline-none"
                      value={collectorSearch}
                      onInput={(e) => {
                        setCollectorSearch(e.detail.value)
                        setShowCollectorOptions(true)
                      }}
                      placeholder="请输入或选择收费员"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCollectorOptions(true)
                        setShowMonitorOptions(false)
                      }}
                    />
                    <View
                      className={`i-mdi-chevron-down text-lg text-muted-foreground transition-transform duration-200 ${showCollectorOptions ? 'rotate-180' : ''}`}
                    />
                  </View>
                  {/* 下拉选项 */}
                  {showCollectorOptions && (
                    <View
                      ref={collectorOptionsRef}
                      className="absolute bottom-full left-0 right-0 bg-white rounded-lg shadow-xl mb-1 max-h-48 overflow-y-auto z-50 border border-gray-200 transition-all duration-200"
                      onClick={(e) => e.stopPropagation()}>
                      {filteredCollectors.length > 0 ? (
                        filteredCollectors.map((collector, _index) => {
                          const isSelected = collectorSearch === `${collector.code} ${collector.name}`
                          return (
                            <View
                              key={collector.id}
                              className={`px-4 py-3 cursor-pointer text-sm transition-all duration-150 ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-50'}`}
                              onClick={() => handleCollectorSelect(collector)}>
                              <Text className={isSelected ? 'text-primary font-medium' : 'text-gray-800'}>
                                {collector.code} {collector.name}
                              </Text>
                            </View>
                          )
                        })
                      ) : (
                        <View className="px-4 py-4 text-center text-sm text-gray-500">
                          <Text>未找到匹配的收费员</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* 监控员 */}
              <View className="flex-1 relative">
                <Text className="text-sm text-muted-foreground mb-2 block">监控员</Text>
                <View className="relative">
                  <View
                    className={`bg-input rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer border ${showMonitorOptions ? 'border-primary' : 'border-transparent'} transition-all duration-200`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMonitorOptions(!showMonitorOptions)
                      setShowCollectorOptions(false)
                    }}>
                    <Input
                      className="w-full text-foreground text-sm focus:outline-none"
                      value={monitorSearch}
                      onInput={(e) => {
                        setMonitorSearch(e.detail.value)
                        setShowMonitorOptions(true)
                      }}
                      placeholder="请输入或选择监控员"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMonitorOptions(true)
                        setShowCollectorOptions(false)
                      }}
                    />
                    <View
                      className={`i-mdi-chevron-down text-lg text-muted-foreground transition-transform duration-200 ${showMonitorOptions ? 'rotate-180' : ''}`}
                    />
                  </View>
                  {/* 下拉选项 */}
                  {showMonitorOptions && (
                    <View
                      ref={monitorOptionsRef}
                      className="absolute bottom-full left-0 right-0 bg-white rounded-lg shadow-xl mb-1 max-h-48 overflow-y-auto z-50 border border-gray-200 transition-all duration-200"
                      onClick={(e) => e.stopPropagation()}>
                      {filteredMonitors.length > 0 ? (
                        filteredMonitors.map((monitor, _index) => {
                          const isSelected = monitorSearch === `${monitor.code} ${monitor.name}`
                          return (
                            <View
                              key={monitor.id}
                              className={`px-4 py-3 cursor-pointer text-sm transition-all duration-150 ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-50'}`}
                              onClick={() => handleMonitorSelect(monitor)}>
                              <Text className={isSelected ? 'text-primary font-medium' : 'text-gray-800'}>
                                {monitor.code} {monitor.name}
                              </Text>
                            </View>
                          )
                        })
                      ) : (
                        <View className="px-4 py-4 text-center text-sm text-gray-500">
                          <Text>未找到匹配的监控员</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* 当前班次和免费原因（并排） */}
            <View className="flex gap-3">
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-2 block">当前班次</Text>
                <View className="bg-input rounded-lg px-3 py-2">
                  <Text className="text-foreground text-sm">{currentShift || '未设置'}</Text>
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground mb-2 block">免费原因</Text>
                <Picker mode="selector" range={FREE_REASONS} value={freeReasonIndex} onChange={handleFreeReasonChange}>
                  <View className="bg-input rounded-lg px-3 py-2 flex items-center justify-between">
                    <Text className={freeReason ? 'text-foreground text-sm' : 'text-muted-foreground text-sm'}>
                      {freeReason || '请选择'}
                    </Text>
                    <View className="i-mdi-chevron-down text-lg text-muted-foreground" />
                  </View>
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* 操作按钮 */}
        <View className="flex gap-3">
          <Button
            className="flex-1 bg-[#1492ff] text-white py-4 rounded-xl break-keep text-base font-medium"
            size="default"
            onClick={handleReRecognize}
            disabled={isSaving || isRecognizing}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-refresh text-xl mr-2" />
              <Text>{isRecognizing ? '识别中...' : '重新识别'}</Text>
            </View>
          </Button>
          <Button
            className="flex-1 bg-gradient-primary text-primary-foreground py-4 rounded-xl break-keep text-base font-medium"
            size="default"
            onClick={handleSave}
            disabled={isSaving || isRecognizing}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-content-save text-xl mr-2" />
              <Text>{isSaving ? '保存中...' : '保存记录'}</Text>
            </View>
          </Button>
        </View>
      </View>
    </View>
  )
}

export default Result
