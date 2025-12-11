import {Button, Image, Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import type React from 'react'
import {useState} from 'react'
import {compressImage, imageToBase64} from '@/utils/imageUtils'
import type {OCRResult} from '@/utils/ocrUtils'
import {recognizeTollReceipt} from '@/utils/ocrUtils'

const Home: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [isRecognizing, setIsRecognizing] = useState(false)

  // 选择图片（从相册）
  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        const imagePath = res.tempFilePaths[0]
        setSelectedImage(imagePath)
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      Taro.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    }
  }

  // 拍照
  const handleTakePhoto = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        const imagePath = res.tempFilePaths[0]
        setSelectedImage(imagePath)
      }
    } catch (error) {
      console.error('拍照失败:', error)
      Taro.showToast({
        title: '拍照失败',
        icon: 'none'
      })
    }
  }

  // 开始识别
  const handleRecognize = async () => {
    if (!selectedImage) {
      Taro.showToast({
        title: '请先选择图片',
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
      const compressedPath = await compressImage(selectedImage, 0.8)

      // 2. 转换为Base64
      const base64Image = await imageToBase64(compressedPath)

      // 3. 调用OCR识别
      const result: OCRResult = await recognizeTollReceipt(base64Image)

      Taro.hideLoading()

      // 4. 跳转到结果页面
      Taro.navigateTo({
        url: `/pages/result/index?data=${encodeURIComponent(
          JSON.stringify({
            ...result,
            imageUrl: selectedImage
          })
        )}`
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

  return (
    <View className="min-h-screen bg-gradient-bg">
      <View className="px-4 py-6">
        {/* 标题区域 */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-foreground block mb-2">免费车登记</Text>
          <Text className="text-sm text-muted-foreground block">拍照或上传车辆信息图片，自动提取关键信息</Text>
        </View>

        {/* 图片预览区域 */}
        <View className="bg-card rounded-xl p-4 mb-6 shadow-card">
          {selectedImage ? (
            <View className="relative">
              <Image src={selectedImage} mode="aspectFit" className="w-full rounded-lg" style={{height: '400px'}} />
              <View
                className="absolute top-2 right-2 bg-destructive rounded-full w-8 h-8 flex items-center justify-center"
                onClick={() => setSelectedImage('')}>
                <View className="i-mdi-close text-xl text-destructive-foreground" />
              </View>
            </View>
          ) : (
            <View className="flex flex-col items-center justify-center py-16">
              <View className="i-mdi-image-outline text-6xl text-muted-foreground mb-4" />
              <Text className="text-muted-foreground text-center">暂无图片</Text>
              <Text className="text-muted-foreground text-sm text-center mt-2">请点击下方按钮拍照或选择图片</Text>
            </View>
          )}
        </View>

        {/* 操作按钮 */}
        <View className="space-y-3">
          {/* 拍照按钮 */}
          <Button
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl break-keep text-base font-medium"
            size="default"
            onClick={handleTakePhoto}
            disabled={isRecognizing}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-camera text-xl mr-2" />
              <Text>拍照</Text>
            </View>
          </Button>

          {/* 选择图片按钮 */}
          <Button
            className="w-full text-secondary-foreground py-4 rounded-xl break-keep text-base font-medium bg-[#1492ff] bg-none"
            size="default"
            onClick={handleChooseImage}
            disabled={isRecognizing}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-image text-xl mr-2" />
              <Text>选择图片</Text>
            </View>
          </Button>

          {selectedImage && (
            <Button
              className="w-full bg-gradient-primary text-primary-foreground py-4 rounded-xl break-keep text-base font-medium"
              size="default"
              onClick={handleRecognize}
              disabled={isRecognizing}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-text-recognition text-xl mr-2" />
                <Text>{isRecognizing ? '识别中...' : '开始识别'}</Text>
              </View>
            </Button>
          )}
        </View>

        {/* 使用说明 */}
        <View className="mt-8 bg-secondary rounded-xl p-4">
          <View className="flex items-center mb-3">
            <View className="i-mdi-information-outline text-xl text-primary mr-2" />
            <Text className="text-base font-medium text-foreground">使用说明</Text>
          </View>
          <View className="space-y-2">
            <View className="flex items-start">
              <Text className="text-primary mr-2">1.</Text>
              <Text className="text-sm text-muted-foreground flex-1">
                点击"拍照"按钮直接拍摄，或点击"选择图片"从相册选择车辆信息照片
              </Text>
            </View>
            <View className="flex items-start">
              <Text className="text-primary mr-2">2.</Text>
              <Text className="text-sm text-muted-foreground flex-1">确保图片清晰，光线充足，文字可辨</Text>
            </View>
            <View className="flex items-start">
              <Text className="text-primary mr-2">3.</Text>
              <Text className="text-sm text-muted-foreground flex-1">点击"开始识别"，系统将自动提取车辆信息</Text>
            </View>
            <View className="flex items-start">
              <Text className="text-primary mr-2">4.</Text>
              <Text className="text-sm text-muted-foreground flex-1">识别完成后可编辑修正，并保存到历史记录</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default Home
