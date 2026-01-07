import {Button, Image, Input, Text, View} from '@tarojs/components'
import Taro, {reLaunch, switchTab} from '@tarojs/taro'
import type React from 'react'
import {useState} from 'react'
import AuthGuard from '@/components/AuthGuard'
import {useAuthStore} from '@/store/auth'
import './index.scss'

const Login: React.FC = () => {
  const {login, isLoading, error, clearError} = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLoginSuccess = () => {
    const path = '/pages/home/index' // home path
    try {
      switchTab({url: path})
    } catch (_e) {
      reLaunch({url: path})
    }
  }

  const handleLogin = async () => {
    // 表单验证
    if (!username.trim()) {
      Taro.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
      return
    }

    if (!password.trim()) {
      Taro.showToast({
        title: '请输入密码',
        icon: 'none'
      })
      return
    }

    clearError()
    const success = await login(username, password)
    if (success) {
      handleLoginSuccess()
    }
  }

  return (
    <AuthGuard requireAuth={false}>
      <View className="login-container">
        <View className="login-header">
          <Image className="app-icon" src="/assets/images/app-icon-rounded.png" mode="aspectFill" />
          <Text className="app-title">免费车登记系统</Text>
          <Text className="app-subtitle">管理员登录</Text>
        </View>

        <View className="login-form">
          {/* 用户名输入框 */}
          <View className="input-group">
            <Text className="input-label">用户名</Text>
            <Input
              className="input-field"
              placeholder="请输入用户名"
              value={username}
              onInput={(e) => setUsername(e.detail.value)}
              autoComplete="username"
              focus
            />
          </View>

          {/* 密码输入框 */}
          <View className="input-group">
            <Text className="input-label">密码</Text>
            <View className="password-input-wrapper">
              <Input
                className="input-field password-input"
                placeholder="请输入密码"
                value={password}
                onInput={(e) => setPassword(e.detail.value)}
                password={!showPassword}
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
              />
              <View className={`password-toggle ${showPassword ? 'unlock' : 'lock'}`} onClick={() => setShowPassword(!showPassword)}>
                <View className="lock-icon">
                  <View className="lock-body"></View>
                  <View className="lock-shackle"></View>
                </View>
              </View>
            </View>
          </View>

          {/* 错误信息 */}
          {error && (
            <View className="error-message">
              <Text>{error}</Text>
            </View>
          )}

          {/* 登录按钮 */}
          <View
            className={`login-button ${isLoading ? 'loading' : ''}`}
            onClick={isLoading ? undefined : handleLogin}>
            {isLoading ? '' : '登录'}
          </View>

          </View>
      </View>
    </AuthGuard>
  )
}

export default Login
