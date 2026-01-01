/**
 * @file Taro application entry file
 */

import type React from 'react'
import type {PropsWithChildren} from 'react'
import {useTabBarPageClass} from '@/hooks/useTabBarPageClass'

import './app.scss'

const App: React.FC = ({children}: PropsWithChildren<unknown>) => {
  useTabBarPageClass()

  // 移除App组件中的登录检查，避免与AuthGuard重复检查导致的页面实例问题
  // 登录状态检查完全由AuthGuard组件处理

  return children
}

export default App
