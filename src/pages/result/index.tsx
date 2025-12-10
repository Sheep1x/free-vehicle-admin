import {Button, Image, Input, Picker, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import type React from 'react'
import {useEffect, useState} from 'react'
import {createTollRecord} from '@/db/api'
import {compressImage, imageToBase64} from '@/utils/imageUtils'
import type {OCRResult} from '@/utils/ocrUtils'
import {recognizeTollReceipt} from '@/utils/ocrUtils'

// 免费原因选项
const FREE_REASONS = ['紧急车', '军警车', '应急车', '旅游包车']

const Result: React.FC = () => {
  const router = useRouter()
  const [imageUrl, setImageUrl] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [axleCount, setAxleCount] = useState('')
  const [tonnage, setTonnage] = useState('')
  const [entryInfo, setEntryInfo] = useState('')
  const [entryTime, setEntryTime] = useState('')
  const [amount, setAmount] = useState('')
  const [freeReason, setFreeReason] = useState('')
  const [tollCollector, setTollCollector] = useState('')
  const [monitor, setMonitor] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRecognizing, setIsRecognizing] = useState(false)

  // 免费原因选择器索引
  const [freeReasonIndex, setFreeReasonIndex] = useState(0)

  useEffect(() => {
    // 从路由参数获取识别结果
    const {data} = router.params
    if (data) {
      try {
        const result = JSON.parse(decodeURIComponent(data))
        setImageUrl(result.imageUrl || '')
        setPlateNumber(result.plateNumber || '')
        setVehicleType(result.vehicleType || '')
        setAxleCount(result.axleCount || '')
        setTonnage(result.tonnage || '')
        setEntryInfo(result.entryInfo || '')
        setEntryTime(result.entryTime || '')
        setAmount(result.amount?.toString() || '')
        setFreeReason(result.freeReason || '')
        setTollCollector(result.tollCollector || '')
        setMonitor(result.monitor || '')
      } catch (error) {
        console.error('解析识别结果失败:', error)
      }
    }
  }, [router.params])

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
      const compressedPath = await compressImage(imageUrl, 0.8)

      // 2. 转换为Base64
      const base64Image = await imageToBase64(compressedPath)

      // 3. 调用OCR识别
      const result: OCRResult = await recognizeTollReceipt(base64Image)

      Taro.hideLoading()

      // 4. 更新表单数据
      setPlateNumber(result.plateNumber || '')
      setVehicleType(result.vehicleType || '')
      setAxleCount(result.axleCount || '')
      setTonnage(result.tonnage || '')
      setEntryInfo(result.entryInfo || '')
      setEntryTime(result.entryTime || '')
      setAmount(result.amount?.toString() || '')

      Taro.showToast({
        title: '识别完成',
        icon: 'success'
      })
    } catch (error) {
      console.error('识别失败:', error)
      Taro.hideLoading()
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

    try {
      const record = await createTollRecord({
        plate_number: plateNumber,
        vehicle_type: vehicleType,
        axle_count: axleCount,
        tonnage: tonnage,
        entry_info: entryInfo,
        entry_time: entryTime,
        amount: amount ? Number.parseFloat(amount) : undefined,
        image_url: imageUrl,
        free_reason: freeReason,
        toll_collector: tollCollector,
        monitor: monitor
      })

      Taro.hideLoading()

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
      Taro.hideLoading()
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

  return (
    <View className="min-h-screen bg-gradient-bg pb-6">
      {/* 自定义返回按钮 */}
      <View className="fixed top-0 left-0 z-50 px-4 py-3" onClick={handleBack}>
        <View className="flex items-center">
          <View className="i-mdi-chevron-left text-3xl text-white" />
        </View>
      </View>

      <View className="px-4 pt-16">
        {/* 图片 */}
        {imageUrl && (
          <View className="bg-card rounded-xl p-4 mb-6 shadow-card">
            <Image src={imageUrl} mode="aspectFit" className="w-full rounded-lg" style={{height: '300px'}} />
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

            {/* 免费原因 */}
            <View>
              <Text className="text-sm text-muted-foreground mb-2 block">免费原因</Text>
              <Picker mode="selector" range={FREE_REASONS} value={freeReasonIndex} onChange={handleFreeReasonChange}>
                <View className="bg-input rounded-lg px-3 py-2 flex items-center justify-between">
                  <Text className={freeReason ? 'text-foreground' : 'text-muted-foreground'}>
                    {freeReason || '请选择免费原因'}
                  </Text>
                  <View className="i-mdi-chevron-down text-lg text-muted-foreground" />
                </View>
              </Picker>
            </View>

            {/* 收费员 */}
            <View>
              <Text className="text-sm text-muted-foreground mb-2 block">收费员</Text>
              <View className="bg-input rounded-lg px-3 py-2">
                <Input
                  className="w-full text-foreground"
                  value={tollCollector}
                  onInput={(e) => setTollCollector(e.detail.value)}
                  placeholder="请输入收费员姓名"
                />
              </View>
            </View>

            {/* 监控员 */}
            <View>
              <Text className="text-sm text-muted-foreground mb-2 block">监控员</Text>
              <View className="bg-input rounded-lg px-3 py-2">
                <Input
                  className="w-full text-foreground"
                  value={monitor}
                  onInput={(e) => setMonitor(e.detail.value)}
                  placeholder="请输入监控员姓名"
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

            {/* 通行时间 */}
            <View>
              <Text className="text-sm text-muted-foreground mb-2 block">通行时间</Text>
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
          </View>
        </View>

        {/* 操作按钮 */}
        <View className="flex gap-3">
          <Button
            className="flex-1 bg-secondary text-secondary-foreground py-4 rounded-xl break-keep text-base"
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
