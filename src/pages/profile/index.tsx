import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import type React from 'react'
import AuthGuard from '@/components/AuthGuard'

const Profile: React.FC = () => {
  // 导出功能提示
  const handleExport = () => {
    Taro.showModal({
      title: '导出功能',
      content: '导出为Excel功能请在后台管理操作！',
      showCancel: false
    })
  }

  // 关于我们
  const handleAbout = () => {
    Taro.showModal({
      title: '关于免费车登记',
      content:
        '通过调用AI大模型自动提取车辆信息\n提高登记效率\n响应无纸化办公。\n其实是不想手写\n \n \n开发: 杨一旭\n版本：v2.0.6',
      showCancel: false
    })
  }

  // 使用帮助
  const handleHelp = () => {
    Taro.showModal({
      title: '使用帮助',
      content:
        '1. 在"登记"页面拍照或上传车辆信息图片\n2. 系统自动识别车辆信息\n3. 选择免费原因并填写相关人员\n4. 确认或编辑识别结果\n5. 保存到历史记录\n6. 在"记录"页面查看和管理历史记录',
      showCancel: false
    })
  }

  const menuItems = [
    {
      icon: 'i-mdi-file-export',
      title: '导出记录',
      desc: '导出为Excel',
      onClick: handleExport
    },
    {
      icon: 'i-mdi-help-circle-outline',
      title: '使用帮助',
      desc: '查看使用说明',
      onClick: handleHelp
    },
    {
      icon: 'i-mdi-information-outline',
      title: '关于我们',
      desc: '了解免费车登记',
      onClick: handleAbout
    }
  ]

  return (
    <AuthGuard>
      <View className="min-h-screen bg-gradient-bg">
        <View className="px-4 py-6">
          {/* 头部卡片 */}
          <View className="bg-gradient-primary rounded-2xl p-6 mb-6 shadow-hover">
            <View className="flex items-center">
              <View className="w-16 h-16 bg-primary-foreground rounded-full flex items-center justify-center mr-4">
                <View className="i-mdi-account text-4xl text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-primary-foreground block mb-1">免费车登记用户</Text>
                <Text className="text-sm text-primary-foreground opacity-80 block">专业的车辆登记助手</Text>
              </View>
            </View>
          </View>

          {/* 功能菜单 */}
          <View className="bg-card rounded-xl shadow-card overflow-hidden mb-6">
            {menuItems.map((item, index) => (
              <View key={item.title}>
                <View className="flex items-center px-4 py-4 active:bg-muted" onClick={item.onClick}>
                  <View className={`${item.icon} text-2xl text-primary mr-4`} />
                  <View className="flex-1">
                    <Text className="text-base text-foreground block mb-1">{item.title}</Text>
                    <Text className="text-sm text-muted-foreground block">{item.desc}</Text>
                  </View>
                  <View className="i-mdi-chevron-right text-xl text-muted-foreground" />
                </View>
                {index < menuItems.length - 1 && <View className="h-px bg-border mx-4" />}
              </View>
            ))}
          </View>

          {/* 统计信息 */}
          <View className="bg-card rounded-xl p-4 shadow-card">
            <View className="flex items-center mb-3">
              <View className="i-mdi-chart-box-outline text-xl text-primary mr-2" />
              <Text className="text-base font-medium text-foreground">使用统计</Text>
            </View>
            <View className="grid grid-cols-3 gap-4">
              <View className="text-center">
                <View className="i-mdi-file-document-outline text-3xl text-primary mb-2" />
                <Text className="text-sm text-muted-foreground block">登记次数</Text>
                <Text className="text-lg font-bold text-foreground block mt-1">-</Text>
              </View>
              <View className="text-center">
                <View className="i-mdi-clock-outline text-3xl text-primary mb-2" />
                <Text className="text-sm text-muted-foreground block">使用天数</Text>
                <Text className="text-lg font-bold text-foreground block mt-1">-</Text>
              </View>
              <View className="text-center">
                <View className="i-mdi-check-circle-outline text-3xl text-primary mb-2" />
                <Text className="text-sm text-muted-foreground block">成功率</Text>
                <Text className="text-lg font-bold text-foreground block mt-1">-</Text>
              </View>
            </View>
          </View>

          {/* 版权信息 */}
          <View className="mt-8 text-center">
            <Text className="text-xs text-muted-foreground block">© 2025 免费车登记</Text>
            <Text className="text-xs text-muted-foreground block mt-1">杨一旭：“真的比手写快多了！”</Text>
          </View>
        </View>
      </View>
    </AuthGuard>
  )
}

export default Profile
