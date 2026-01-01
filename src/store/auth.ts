import {create} from 'zustand'
import {getStationByAdminId, login as loginApi} from '@/db/api'
import type {AdminUser} from '@/db/types'
import {verifyPassword} from '@/utils/authUtils'
import {taroStorage} from '@/utils/storage'

interface AuthStore {
  isLoggedIn: boolean
  user: (AdminUser & {station_info?: any}) | null
  loginTime: number | null
  isLoading: boolean
  error: string | null

  // Actions
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<boolean>
  clearError: () => void
  updateUserStation: () => Promise<void>
}

const SESSION_TIMEOUT = 8 * 60 * 60 * 1000 // 8小时会话超时

const STORAGE_KEY = 'auth-storage'

// 自定义Taro存储中间件
const taroPersist = (config: any) => (set: any, get: any, api: any) => {
  const storage = {
    getItem: async (name: string) => {
      const state = await taroStorage.getItem(STORAGE_KEY)
      if (state) {
        const parsed = JSON.parse(state)
        return parsed[name]
      }
      return undefined
    },
    setItem: async (name: string, value: any) => {
      const state = await taroStorage.getItem(STORAGE_KEY)
      const newState = state ? JSON.parse(state) : {}
      newState[name] = value
      await taroStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    },
    removeItem: async (name: string) => {
      const state = await taroStorage.getItem(STORAGE_KEY)
      if (state) {
        const parsed = JSON.parse(state)
        delete parsed[name]
        await taroStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      }
    }
  }

  return config(set, get, {
    ...api,
    storage
  })
}

export const useAuthStore = create<AuthStore>()(
  taroPersist((set, get) => ({
    isLoggedIn: false,
    user: null,
    loginTime: null,
    isLoading: false,
    error: null,

    login: async (username: string, password: string) => {
      set({isLoading: true, error: null})
      
      // 添加调试日志
      console.log('开始登录流程，用户名:', username)

      try {
        const response = await loginApi(username, password)
        
        console.log('loginApi响应:', response)

        if (response.success && response.user) {
          console.log('用户信息获取成功:', response.user.username, '，角色:', response.user.role)
          console.log('存储的密码哈希:', response.user.password)
          
          // 使用标准bcrypt验证密码，与admin面板保持一致
          console.log('开始验证密码...')
          const isPasswordValid = await verifyPassword(password, response.user.password, response.user.created_at)
          
          console.log('密码验证结果:', isPasswordValid)
          
          if (isPasswordValid) {
            // 获取用户所属收费站信息
            const stationInfo = await getStationByAdminId(response.user.id)
            
            set({
              isLoggedIn: true,
              user: {
                ...response.user,
                station_info: stationInfo // 添加收费站信息到用户对象
              },
              loginTime: Date.now(),
              isLoading: false,
              error: null
            })
            console.log('登录成功，用户已登录:', response.user.username)
            return true
          } else {
            set({
              isLoggedIn: false,
              user: null,
              isLoading: false,
              error: '用户名或密码错误'
            })
            console.log('登录失败：密码验证失败')
            return false
          }
        } else {
          set({
            isLoggedIn: false,
            user: null,
            isLoading: false,
            error: response.message || '登录失败'
          })
          console.log('登录失败：API响应失败，消息:', response.message)
          return false
        }
      } catch (error) {
        console.error('登录异常:', error)
        set({
          isLoggedIn: false,
          user: null,
          isLoading: false,
          error: '登录失败，请稍后重试'
        })
        console.log('登录失败：捕获到异常，错误:', error)
        return false
      }
    },

    logout: () => {
      set({
        isLoggedIn: false,
        user: null,
        loginTime: null,
        error: null
      })
    },

    checkAuth: async () => {
      const {isLoggedIn, user, loginTime} = get()

      // 1. 如果内存中已登录，检查会话是否超时
      if (isLoggedIn && user && loginTime) {
        // 检查会话是否超时
        if (Date.now() - loginTime > SESSION_TIMEOUT) {
          get().logout()
          return false
        }
        return true
      }

      // 2. 如果内存中未登录，尝试从本地存储恢复
      try {
        const savedUserStr = await taroStorage.getItem(STORAGE_KEY)
        if (savedUserStr) {
          const savedUser = JSON.parse(savedUserStr)
          if (savedUser.user && savedUser.loginTime) {
            // 检查会话是否超时
            if (Date.now() - savedUser.loginTime > SESSION_TIMEOUT) {
              get().logout()
              return false
            }
            // 恢复登录状态
            set({
              isLoggedIn: true,
              user: savedUser.user,
              loginTime: savedUser.loginTime
            })
            return true
          }
        }
      } catch (error) {
        console.error('恢复登录状态失败:', error)
      }

      // 3. 无法恢复或会话超时
      return false
    },

    clearError: () => {
      set({error: null})
    },

    updateUserStation: async () => {
      const currentUser = get().user
      if (currentUser) {
        try {
          const stationInfo = await getStationByAdminId(currentUser.id)
          set({
            user: {
              ...currentUser,
              station_info: stationInfo
            }
          })
        } catch (error) {
          console.error('更新用户收费站信息失败:', error)
        }
      }
    }
  }))
)

// 检查是否已登录的辅助函数
export const isAuthenticated = (): boolean => {
  return useAuthStore.getState().isLoggedIn
}

// 获取当前用户的辅助函数
export const getCurrentUser = (): AdminUser | null => {
  return useAuthStore.getState().user
}

// 检查用户角色的辅助函数
export const hasRole = (role: string): boolean => {
  const user = getCurrentUser()
  return user?.role === role
}

// 检查用户是否有特定权限的辅助函数
export const hasPermission = (permission: string): boolean => {
  const user = getCurrentUser()
  if (!user) return false

  // 超级管理员拥有所有权限
  if (user.role === 'super_admin') return true

  // 分公司管理员权限
  if (user.role === 'company_admin') {
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
  if (user.role === 'station_admin') {
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
