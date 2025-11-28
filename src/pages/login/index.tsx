import {View} from '@tarojs/components'
import {reLaunch, switchTab} from '@tarojs/taro'
import {LoginPanel} from 'miaoda-auth-taro'
import type React from 'react'

const Login: React.FC = () => {
  const handleLoginSuccess = async (_user: any) => {
    const path = '/pages/home/index' // home path
    try {
      switchTab({url: path})
    } catch (_e) {
      reLaunch({url: path})
    }
  }

  return (
    <View>
      <LoginPanel onLoginSuccess={handleLoginSuccess} />
    </View>
  )
}

export default Login
