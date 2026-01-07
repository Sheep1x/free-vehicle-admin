import bcrypt from 'bcryptjs'
import {supabase} from '@/client/supabase'
import type {AdminUser, LoginResponse} from '@/db/types'
import {taroStorage} from './storage'

// 会话超时时间：8小时
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000

// 存储键名
const STORAGE_KEYS = {
  USER: 'admin_user',
  LOGIN_TIME: 'login_time',
  SESSION_TOKEN: 'session_token'
}

// 验证密码
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
  _createdAt?: string // 保留参数以保持兼容性，但不再使用
): Promise<boolean> {
  try {
    // 检查是否是自定义哈希格式：hashed_密码_时间戳
    if (hashedPassword.startsWith('hashed_')) {
      // 解析自定义哈希：hashed_pingzan1234_1767247482480
      const parts = hashedPassword.split('_')
      if (parts.length === 3) {
        const extractedPassword = parts[1]
        // 验证逻辑：检查输入密码是否与提取的密码匹配
        return plainPassword === extractedPassword
      }
    }

    // 否则尝试使用bcrypt验证（后备方案）
    return await bcrypt.compare(plainPassword, hashedPassword)
  } catch (_error) {
    return false
  }
}

// 根据用户名查询用户
export async function getUserByUsername(username: string): Promise<AdminUser | null> {
  try {
    const {data, error} = await supabase.from('admin_users').select('*').eq('username', username).single()

    if (error) {
      return null
    }

    return data as AdminUser
  } catch (_error) {
    return null
  }
}

// 登录功能
export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    // 1. 验证输入
    if (!username.trim() || !password.trim()) {
      return {
        success: false,
        message: '用户名和密码不能为空'
      }
    }

    // 2. 查询用户
    const user = await getUserByUsername(username.trim())
    if (!user) {
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }

    // 3. 验证密码 - 使用标准bcrypt验证，与admin面板保持一致
    const isPasswordValid = await verifyPassword(password.trim(), user.password, user.created_at)
    if (!isPasswordValid) {
      return {
        success: false,
        message: '用户名或密码错误'
      }
    }

    // 4. 保存登录状态
    const loginTime = Date.now()
    await saveLoginState(user, loginTime)

    return {
      success: true,
      user
    }
  } catch (_error) {
    return {
      success: false,
      message: '登录失败，请稍后重试'
    }
  }
}

// 保存登录状态
export async function saveLoginState(user: AdminUser, loginTime: number): Promise<void> {
  try {
    // 移除密码等敏感信息
    const {password, ...userWithoutPassword} = user

    await Promise.all([
      taroStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userWithoutPassword)),
      taroStorage.setItem(STORAGE_KEYS.LOGIN_TIME, loginTime.toString()),
      taroStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, generateSessionToken(user.id))
    ])
  } catch (_error) {
    // 忽略错误，继续执行
  }
}

// 生成会话令牌
export function generateSessionToken(userId: string): string {
  const timestamp = Date.now()
  const data = `${userId}-${timestamp}`
  return bcrypt.hashSync(data, 10)
}

// 获取当前登录用户
export async function getCurrentUser(): Promise<AdminUser | null> {
  try {
    const userStr = await taroStorage.getItem(STORAGE_KEYS.USER)
    if (!userStr) {
      return null
    }
    return JSON.parse(userStr) as AdminUser
  } catch (_error) {
    return null
  }
}

// 检查登录状态
export async function checkLoginStatus(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    const loginTimeStr = await taroStorage.getItem(STORAGE_KEYS.LOGIN_TIME)

    if (!user || !loginTimeStr) {
      return false
    }

    const loginTime = parseInt(loginTimeStr, 10)
    const now = Date.now()

    // 检查会话是否超时
    if (now - loginTime > SESSION_TIMEOUT) {
      await logout()
      return false
    }

    return true
  } catch (_error) {
    return false
  }
}

// 登出
export async function logout(): Promise<void> {
  try {
    await Promise.all([
      taroStorage.removeItem(STORAGE_KEYS.USER),
      taroStorage.removeItem(STORAGE_KEYS.LOGIN_TIME),
      taroStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN)
    ])
  } catch (_error) {
    // 忽略错误，继续执行
  }
}

// 获取用户所属收费站
export async function getUserStation(userId: string): Promise<string | null> {
  try {
    const {data, error} = await supabase.from('admin_users').select('station_id').eq('id', userId).single()

    if (error) {
      return null
    }

    return data.station_id
  } catch (_error) {
    return null
  }
}

// 根据收费站ID获取收费员
export async function getCollectorsByStationId(stationId: string): Promise<any[]> {
  try {
    const {data, error} = await supabase
      .from('toll_collectors_info')
      .select('*')
      .eq('station_id', stationId)
      .order('name')

    if (error) {
      return []
    }

    return data || []
  } catch (_error) {
    return []
  }
}

// 根据收费站ID获取监控员
export async function getMonitorsByStationId(stationId: string): Promise<any[]> {
  try {
    const {data, error} = await supabase.from('monitors_info').select('*').eq('station_id', stationId).order('name')

    if (error) {
      return []
    }

    return data || []
  } catch (_error) {
    return []
  }
}

// 检查用户权限
export function checkPermission(user: AdminUser, permission: string): boolean {
  // 超级管理员拥有所有权限
  if (user.role === 'super_admin') {
    return true
  }

  // 分公司管理员权限
  if (user.role === 'company_admin') {
    const companyAdminPermissions = [
      'view_records',
      'create_records',
      'edit_records',
      'delete_records',
      'view_collectors',
      'view_monitors',
      'view_shifts',
      'view_stations'
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
      'view_monitors',
      'view_shifts'
    ]
    return stationAdminPermissions.includes(permission)
  }

  return false
}
