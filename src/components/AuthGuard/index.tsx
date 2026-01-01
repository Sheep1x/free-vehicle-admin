import {Text, View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {useEffect} from 'react'
import {useAuthStore} from '@/store/auth'
import './index.scss'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requirePermission?: string
}

const AuthGuard: React.FC<AuthGuardProps> = ({children, requireAuth = true, requirePermission}) => {
  const {isLoggedIn, user, checkAuth, logout} = useAuthStore()

  useEffect(() => {
    const checkAuthentication = async () => {
      // 如果不需要认证，直接返回
      if (!requireAuth) {
        return
      }

      // 检查登录状态
      const isAuthenticated = await checkAuth()

      if (!isAuthenticated) {
        // 未登录，跳转到登录页
        Taro.reLaunch({
          url: '/pages/login/index'
        })
        return
      }

      // 检查权限
      if (requirePermission && user) {
        const hasPermission = checkUserPermission(user.role, requirePermission)
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
    }

    checkAuthentication()
  }, [requireAuth, requirePermission, user, checkAuth])

  // 如果需要认证但未登录，显示加载中
  if (requireAuth && !isLoggedIn) {
    return (
      <View className="auth-guard-loading">
        <Text className="loading-text">加载中...</Text>
      </View>
    )
  }

  // 如果已登录或有权限，渲染子组件
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
