import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect, useState} from 'react'
import {useAuthStore} from '@/store/auth'
import './index.scss'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requirePermission?: string
}

const AuthGuard: React.FC<AuthGuardProps> = ({children, requireAuth = true, requirePermission}) => {
  const {isLoggedIn, user, checkAuth, logout} = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuthentication = async () => {
      console.log('AuthGuard: 开始检查认证状态')
      // 如果不需要认证，直接返回
      if (!requireAuth) {
        console.log('AuthGuard: 不需要认证，直接通过')
        setIsChecking(false)
        return
      }

      try {
        // 检查登录状态
        console.log('AuthGuard: 检查登录状态')
        const isAuthenticated = await checkAuth()
        console.log('AuthGuard: 登录状态检查结果:', isAuthenticated)

        if (!isAuthenticated) {
          // 未登录，跳转到登录页
          console.log('AuthGuard: 未登录，跳转到登录页')
          Taro.reLaunch({
            url: '/pages/login/index'
          })
          setIsChecking(false)
          return
        }

        // 检查权限
        if (requirePermission && user) {
          console.log('AuthGuard: 检查权限:', requirePermission)
          const hasPermission = checkUserPermission(user.role, requirePermission)
          console.log('AuthGuard: 权限检查结果:', hasPermission)
          if (!hasPermission) {
            Taro.showToast({
              title: '权限不足',
              icon: 'none',
              duration: 2000
            })
            // 跳转到首页
            Taro.switchTab({
              url: '/pages/home/index'
            })
          }
        }
      } catch (error) {
        console.error('AuthGuard: 认证检查失败:', error)
        // 出错时，默认允许访问，避免页面空白
        console.log('AuthGuard: 认证检查出错，默认允许访问')
      } finally {
        setIsChecking(false)
      }
    }

    checkAuthentication()
  }, [requireAuth, requirePermission, user, checkAuth])

  // 如果正在检查或需要认证但未登录，显示加载中
  if (isChecking) {
    console.log('AuthGuard: 正在检查认证状态，显示加载中')
    return (
      <View className="auth-guard-loading">
        <Text className="loading-text">加载中...</Text>
      </View>
    )
  }

  // 如果已登录或有权限，渲染子组件
  console.log('AuthGuard: 认证通过，渲染子组件')
  return <>{children}</>
}

// 检查用户权限的辅助函数
function checkUserPermission(role: string, permission: string): boolean {
  // 超级管理员拥有所有权限
  if (role === 'super_admin') return true

  // 分公司管理员权限
  if (role === 'company_admin') {
    const companyAdminPermissions = [
      'view_records',
      'create_records',
      'edit_records',
      'delete_records',
      'view_collectors',
      'manage_collectors',
      'view_monitors',
      'manage_monitors',
      'view_shifts',
      'manage_shifts',
      'view_users',
      'manage_users'
    ]
    return companyAdminPermissions.includes(permission)
  }

  // 收费站管理员权限
  if (role === 'station_admin') {
    const stationAdminPermissions = [
      'view_records',
      'create_records',
      'edit_records',
      'view_collectors',
      'view_monitors'
    ]
    return stationAdminPermissions.includes(permission)
  }

  return false
}

export default AuthGuard
